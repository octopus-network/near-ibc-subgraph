import { near, BigInt, log, Bytes, json } from "@graphprotocol/graph-ts"
import { CrossChainTransfer, ReceiptLink } from "../generated/schema"
import { JSON } from "assemblyscript-json";
import { parseAttributes } from "./util";
import { CrossChainTransferHelper } from "./cross_chain_transfer"
import { cross_chain_transfer_status, cross_chain_transfer_type } from "./types"

export function handleReceipt(
	receiptWithOutcome: near.ReceiptWithOutcome
): void {
	let outcome = receiptWithOutcome.outcome;
	let receipt = receiptWithOutcome.receipt;
	let actions = receiptWithOutcome.receipt.actions;
	for (let i = 0; i < actions.length; i++) {
		let action = actions[i]
		if (action.kind != near.ActionKind.FUNCTION_CALL) {
			continue
		}
		let fc_action = action.toFunctionCall()
		if (fc_action.methodName == "deliver") {
			createReceiptLinks(fc_action, receiptWithOutcome);
			handleDeliver(receiptWithOutcome);
		}
		if (fc_action.methodName == "mint_asset") {
			createReceiptLinks(fc_action, receiptWithOutcome);
			// todo
			handleMintAsset(fc_action, receiptWithOutcome);
		}
		if (fc_action.methodName == "mint_callback") {
			handleMintCallback(fc_action, receiptWithOutcome);

		}
		if (fc_action.methodName == "do_transfer") {
			createReceiptLinks(fc_action, receiptWithOutcome);
			// handleDoTransfer(fc_action, receiptWithOutcome);
		}
		if (fc_action.methodName == "ft_transfer_callback") {
			handleFtTransferCallback(fc_action, receiptWithOutcome);
		}

		if (fc_action.methodName == "process_transfer_request") {
			createReceiptLinks(fc_action, receiptWithOutcome);
			handleProcessTransferRequest(fc_action, receiptWithOutcome)
		}

		if (fc_action.methodName == "apply_transfer_request") {
			handleApplyTransferRequest(fc_action, receiptWithOutcome)
		}

		// if (fc_action.methodName == "cancel_transfer_request") {
		// 	handleCancelTransferRequest(fc_action, receiptWithOutcome)
		// }
	}
}

export function handleDeliver(outcome: near.ReceiptWithOutcome): void {

	let receipt_id = outcome.receipt.id.toBase58();
	for (let i = 0; i < outcome.outcome.logs.length; i++) {
		let outcomeLog = outcome.outcome.logs[i];
		if (outcomeLog.startsWith("EVENT_JSON:")) {
			let jsonObject = <JSON.Obj>(JSON.parse(outcomeLog.replace("EVENT_JSON:", "")));
			let standard = jsonObject.get("standard")!.toString();
			let version = jsonObject.get("version")!.toString();

			let ibc_raw_event = jsonObject.getObj("raw-ibc-event");
			if (!ibc_raw_event) continue;
			let block_height = BigInt.fromString(jsonObject.getString("block_height")!.valueOf())
			let epoch_height = BigInt.fromString(jsonObject.getString("epoch_height")!.valueOf())
			if (ibc_raw_event.get("Module")) {
				let module = ibc_raw_event.getObj("Module")!
				let kind = module.getString("kind")!.valueOf()
				log.warning("ibc_raw_event: {}", [ibc_raw_event.toString()])
				// let attributes = module.getArr("attributes")!
				let attributes = parseAttributes(module.getArr("attributes")!);
				if (!attributes.has("success")) {
					return
				}
				if (kind == "fungible_token_packet") {
					let denom = attributes.get("denom")!

					if (denom.startsWith("transfer/channel")) {
						CrossChainTransferHelper.create(
							receipt_id,
							attributes,
							block_height,
							epoch_height,
							cross_chain_transfer_type.redeem_to_near
						)
						// redeem to near
						// handleRedeemToNear(receipt_id, ibc_raw_event, attributes, block_height, epoch_height)
					} else {
						CrossChainTransferHelper.create(
							receipt_id,
							attributes,
							block_height,
							epoch_height,
							cross_chain_transfer_type.transfer_to_near
						)
						// transfer to near
						// handleTransferToNear(receipt_id, ibc_raw_event, attributes, block_height, epoch_height)
					}
				}
			}
		}
	}
}


export function handleMintAsset(fc_action: near.FunctionCallAction, outcome: near.ReceiptWithOutcome): void {

}

export function handleMintCallback(fc_action: near.FunctionCallAction, receiptWithOutcome: near.ReceiptWithOutcome): void {

	let receipt_id = receiptWithOutcome.receipt.id.toBase58()

	let logs = receiptWithOutcome.outcome.logs;

	for (let i = 0; i < logs.length; i++) {
		let outcome_log = logs[i]
		if (outcome_log.startsWith("EVENT_JSON:")) {
			let logObject = <JSON.Obj>(JSON.parse(outcome_log.replace("EVENT_JSON:", "")));
			let event = logObject.getString("event")!.valueOf()
			if (event == "MINT_SUCCEEDED" || event == "ERR_MINT") {
				let cross_chain_transfer = get_cross_chain_transfer_entity_from_receipt_grandfather(receipt_id)
				if (event == "MINT_SUCCEEDED") {
					cross_chain_transfer.status = cross_chain_transfer_status.successful
				} else {
					cross_chain_transfer.status = cross_chain_transfer_status.failed
				}
				cross_chain_transfer.save()
			}
		}
	}
}

export function handleDoTransfer(fc_action: near.FunctionCallAction, outcome: near.ReceiptWithOutcome): void {
	let receipt_id = outcome.receipt.id.toBase58()
	// let do_transfer = new DoTransfer(receipt_id);

}

export function handleFtTransferCallback(fc_action: near.FunctionCallAction, receiptWithOutcome: near.ReceiptWithOutcome): void {
	let receipt_id = receiptWithOutcome.receipt.id.toBase58()

	let logs = receiptWithOutcome.outcome.logs;

	for (let i = 0; i < logs.length; i++) {
		let outcome_log = logs[i]
		if (outcome_log.startsWith("EVENT_JSON:")) {
			let logObject = <JSON.Obj>(JSON.parse(outcome_log.replace("EVENT_JSON:", "")));
			let event = logObject.getString("event")!.valueOf()
			if (event == "FT_TRANSFER_SUCCEEDED" || event == "ERR_FT_TRANSFER") {
				let cross_chain_transfer = get_cross_chain_transfer_entity_from_receipt_grandfather(receipt_id)
				if (event == "FT_TRANSFER_SUCCEEDED") {
					cross_chain_transfer.status = cross_chain_transfer_status.successful
				} else {
					cross_chain_transfer.status = cross_chain_transfer_status.failed
				}
				cross_chain_transfer.save()
			}
		}
	}
}
export function handleProcessTransferRequest(fc_action: near.FunctionCallAction, receiptWithOutcome: near.ReceiptWithOutcome): void {

	let receipt_id = receiptWithOutcome.receipt.id.toBase58();
	let is_failed = true;
	for (let i = 0; i < receiptWithOutcome.outcome.logs.length; i++) {
		let outcomeLog = receiptWithOutcome.outcome.logs[i];
		if (outcomeLog.startsWith("EVENT_JSON:")) {
			let jsonObject = <JSON.Obj>(JSON.parse(outcomeLog.replace("EVENT_JSON:", "")));
			let standard = jsonObject.get("standard")!.toString();
			let version = jsonObject.get("version")!.toString();

			let ibc_raw_event = jsonObject.getObj("raw-ibc-event");
			if (!ibc_raw_event) continue;
			let block_height = BigInt.fromString(jsonObject.getString("block_height")!.valueOf())
			let epoch_height = BigInt.fromString(jsonObject.getString("epoch_height")!.valueOf())
			if (ibc_raw_event.get("Module")) {
				let module = ibc_raw_event.getObj("Module")!
				let kind = module.getString("kind")!.valueOf()
				log.warning("ibc_raw_event: {}", [ibc_raw_event.toString()])
				// let attributes = module.getArr("attributes")!
				let attributes = parseAttributes(module.getArr("attributes")!);
				
				if (kind == "ibc_transfer") {
					is_failed = false
					let denom = attributes.get("denom")!

					if (denom.startsWith("transfer/channel")) {
						// redeem to other
						CrossChainTransferHelper.create(
							receipt_id,
							attributes,
							block_height,
							epoch_height,
							cross_chain_transfer_type.redeem_to_other
						)

					} else {
						// transfer to other
						CrossChainTransferHelper.create(
							receipt_id,
							attributes,
							block_height,
							epoch_height,
							cross_chain_transfer_type.transfer_to_other
						)
					}
				}
			}
		}
	}
	if(is_failed) {
		let args = json.fromBytes(fc_action.args).toObject();
		let transfer_request = args.get("transfer_request")!.toObject()

		let cross_chain_transfer = new CrossChainTransfer(receipt_id);
		cross_chain_transfer.sender = transfer_request.get("sender")!.toString()
		cross_chain_transfer.receiver = transfer_request.get("receiver")!.toString()
		cross_chain_transfer.denom = transfer_request.get("token_denom")!.toString()
		cross_chain_transfer.amount = BigInt.fromString(transfer_request.get("amount")!.toString())

		cross_chain_transfer.receipt_id = receipt_id

		let predecessorId = receiptWithOutcome.receipt.predecessorId
		if(predecessorId.includes("ef.transfer")) {
			cross_chain_transfer.type = cross_chain_transfer_type.transfer_to_other
		} else if(predecessorId.includes("tf.transfer"))
		cross_chain_transfer.type = cross_chain_transfer_type.redeem_to_other
		cross_chain_transfer.status = cross_chain_transfer_status.pending

		// other_to_near.transfer_to_near_execution = transfer_to_near.id
		cross_chain_transfer.save()
		}
}

export function handleApplyTransferRequest(fc_action: near.FunctionCallAction, receiptWithOutcome: near.ReceiptWithOutcome): void {
	let receipt_id = receiptWithOutcome.receipt.id.toBase58()
	let cross_chain_transfer = get_cross_chain_transfer_from_father(receipt_id)
	cross_chain_transfer.status = cross_chain_transfer_status.successful
	cross_chain_transfer.save()
}

export function handleCancelTransferRequest(fc_action: near.FunctionCallAction, receiptWithOutcome: near.ReceiptWithOutcome): void {
	let receipt_id = receiptWithOutcome.receipt.id.toBase58()
	let cross_chain_transfer = get_cross_chain_transfer_from_father(receipt_id)
	cross_chain_transfer.status = cross_chain_transfer_status.failed
	cross_chain_transfer.save()
}


function get_cross_chain_transfer_from_father(receipt_id: string): CrossChainTransfer {
	log.warning("receipt: {}", [receipt_id])
	let father_receipt = get_father_receipt(receipt_id)!;
	log.warning("father receipt: {}", [father_receipt])
	return CrossChainTransfer.load(father_receipt)!
}

function get_cross_chain_transfer_entity_from_receipt_grandfather(receipt_id: string): CrossChainTransfer {
	let grandfather_receipt_id = get_father_receipt(get_father_receipt(receipt_id)!)!
	return CrossChainTransfer.load(grandfather_receipt_id)!
}

function get_father_receipt(receipt_id: string): string | null {
	let receipt_link = ReceiptLink.load(receipt_id)!
	return receipt_link.father
}

export function createReceiptLinks(fc_action: near.FunctionCallAction, outcome: near.ReceiptWithOutcome): void {
	let receipt_id = outcome.receipt.id.toBase58()
	let receipt_ids = outcome.outcome.receiptIds;
	for (let i = 0; i < receipt_ids.length; i++) {
		let son_id = receipt_ids[i].toBase58();
		let receipt_link = new ReceiptLink(son_id)
		receipt_link.method_name = fc_action.methodName
		receipt_link.father = receipt_id
		receipt_link.save()
	}
}
import { CrossChainTransfer } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts"
import {cross_chain_transfer_status, cross_chain_transfer_type} from "./types"

export class CrossChainTransferHelper {

	static create(
		receipt_id: string,
		attributes: Map<string, string>,
		block_height: BigInt,
		epoch_height: BigInt,
		type: cross_chain_transfer_type.CrossChainTransferType
	): CrossChainTransfer {

		let cross_chain_transfer = new CrossChainTransfer(receipt_id);
		cross_chain_transfer.sender = attributes.get("sender")!
		cross_chain_transfer.receiver = attributes.get("receiver")!
		cross_chain_transfer.denom = attributes.get("denom")!
		cross_chain_transfer.amount = BigInt.fromString(attributes.get("amount")!)
		cross_chain_transfer.memo = attributes.get("memo")!

		cross_chain_transfer.block_height = block_height
		cross_chain_transfer.epoch_height = epoch_height

		cross_chain_transfer.receipt_id = receipt_id
		cross_chain_transfer.type = type
		cross_chain_transfer.status = cross_chain_transfer_status.pending

		// other_to_near.transfer_to_near_execution = transfer_to_near.id
		cross_chain_transfer.save()
		return cross_chain_transfer
	}


}


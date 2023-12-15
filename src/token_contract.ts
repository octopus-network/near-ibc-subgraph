import { json, log, near } from "@graphprotocol/graph-ts";
import { TracePathAndBaseDenomToTokenContract } from "../generated/schema";

export class TracePathAndBaseDenomToTokenContractHelper {

	static get_id(trace_path: string, base_denom: string): string {
		return `${trace_path}#${base_denom}`
	}

	static createByRegisterAssetForChannel(
		fc_action: near.FunctionCallAction,
		receiptWithOutcome: near.ReceiptWithOutcome
	): void {
		let args = json.fromBytes(fc_action.args).toObject();
		let trace_path = args.get("trace_path")!.toString()
		let base_denom = args.get("base_denom")!.toString()
		let token_contract = args.get("token_contract")!.toString()
		let tmp =  new TracePathAndBaseDenomToTokenContract(this.get_id(trace_path, base_denom))
		tmp.trace_path = trace_path
		tmp.base_denom = base_denom
		tmp.token_contract = token_contract
		tmp.registered_receipt_id = receiptWithOutcome.receipt.id.toBase58()
		tmp.save()
	}

	static getObj(
		trace_path: string,
		base_denom: string
	): TracePathAndBaseDenomToTokenContract {
		log.warning("trace_path+ base_denom {}", [this.get_id(trace_path, base_denom)])
		return TracePathAndBaseDenomToTokenContract.load(this.get_id(trace_path, base_denom))!
	}

}
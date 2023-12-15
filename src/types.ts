
export namespace cross_chain_transfer_type {
	export type CrossChainTransferType = string
	export const transfer_to_near = 'TransferToNear'
	export const redeem_to_near = 'RedeemToNear'
	export const transfer_to_other = 'TransferToOther'
	export const redeem_to_other = 'RedeemToOther'
}

export namespace cross_chain_transfer_status {
	export type CrossChainTransferStatus = string
	export const pending = 'Pending'
	export const successful = 'Successful'
	export const failed = 'Failed'
}
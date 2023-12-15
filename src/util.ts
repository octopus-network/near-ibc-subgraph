import { JSON, JSONEncoder } from "assemblyscript-json";

export function parseAttributes(jsonArr: JSON.Arr): Map<string, string> {
	let arr = jsonArr.valueOf()
	let res = new Map<string, string>()
	for(let i = 0;i<arr.length;i++) {
		let v = <JSON.Obj>arr[i]
		res.set(v.getString("key")!.valueOf(), v.getString("value")!.valueOf())
	}

	return res
}
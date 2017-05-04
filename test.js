function pick_topics(arr) {
	if (!arr.length) return
	if (arr.length === 1) return 1
	var res = {}
	// 遍历数组
	for (var i=0,l=arr.length;i<l;i++) {
		if (!res[arr[i]]) {
			res[arr[i]] = 1
		} else {
			res[arr[i]]++
		}
	}
	// 遍历 res
	var keys = Object.keys(res)
	var maxNum = 0, maxEle
	for (var i=0;i<keys.length;i++) {
		if (res[keys[i]] > maxNum) {
			maxNum = res[keys[i]]
			maxEle = keys[i]
		}
	}
	var arr_result=[];
	for (key in res){
		if(res[key]==maxNum){
			arr_result.push(key)
		}
	}
	var hash=maxEle+":"+maxNum;
	return arr_result
}

console.log(pick_topics([1,2,3,4,56,4,8,1,5,7,41,5,4,1,0]))
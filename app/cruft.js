// This contains mostly hacks for things which should be done better
// (also see data.js)

function ForProps(data, func){
    for(var prop in data){
	if(data.hasOwnProperty(prop)){
	    func([data[prop],prop])
	}
    }
}

function CountProps(data){
    var n=0
    for(var prop in data){
	if(data.hasOwnProperty(prop)){
	    n++
	}
    }
    return n
}

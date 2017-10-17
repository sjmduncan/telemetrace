function LapDiffDist(l1, l2, key){
    var d2max = l2[l2.length-1].Distance
    // TODO: Check that max dists are about the same
    function GetNearestIndexByDist(startIndex, refDistPercent, lap, range){
        var ir = range == undefined ? 10 : range
        var i0 = Math.max(0,startIndex-ir)
        var i1 = Math.min(lap.length, startIndex+ir)
        if( i1 <= i0 ){
            return -1
        } 
        
        var i, nearesti=-1
        var dmin=Math.abs(refDist-lap[i0].Distance)
        for(i=i0; i<i1; i++)
        {
            var d=Math.abs(refDist-lap[i].Distance)
            if( d <= dmin ){
                dmin=d
                nearesti = i
            }else{
                break
            }
        }
        return nearesti
    }
    var ilast=0
    l2.forEach(function (p2){
        var i1 = GetNearestIndexByDist(ilast, p2.Distance/d2max, l1)

        if(i1 >= 0){
            ilast=i1
            var p1=l1[i1]
            p2['Diff'] = p2[key]-p1[key]
        }else{
            console.log("Someone done goofed")
        }
    })
}
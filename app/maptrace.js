function MakeMapTrace(container,canvasid,classname){
    var svg=d3.select(container).append('svg')
	.attr("id", canvasid)
    	.attr("class", classname)

    var size
    
    var margin=8

    var kx,ky

    var data
    var trak
    function DrawTrace(trace, id, classname, trk){
	trak=trk
	size=svg.node().parentNode.getBoundingClientRect()
	kx=trk.x
	ky=trk.y
	data=trace
	y=d3.scaleLinear().range([size.height-margin,margin])
	var exty=d3.extent(trace, function(d){return trk.invy*d[trk.y]})
	y.domain(exty)
	x=d3.scaleLinear().range([margin,size.width-margin])
	var extx=d3.extent(trace, function(d){return trk.invx*d[trk.x]})
	x.domain(extx)
	
	var svgpath=d3.line()
	    .y(function(d){return y(trk.invy*d[trk.y])})
	    .x(function(d){return x(trk.invx*d[trk.x])})
	
	svg.select('#mapt').remove()
	var g=svg.append('g')
	    .attr('id', 'mapt')
	    .attr('class', classname)
	
	g.append('path')
	    .data([trace])
	    .attr("class", classname)
	    .attr('id', 'mapt')
	    .attr("d", svgpath)
	
    }
    
    function Clear(){
	svg.selectAll('g').remove()
    }
    

    function OverlayCircle(ind){
	ClearCircles()
	var geoP=data[ind]
	var r=2
	var classname='trace motorcycle'
	svg.append('g')
	    .append('circle')
	    .attr('cx', x(trak.invx*geoP[kx]))
	    .attr('cy', y(trak.invy*geoP[ky]))
	    .attr('r', r)
	    .attr('class', classname)
    }
    function ClearCircles(){
	svg.selectAll('circle').remove()
    }
    
    return {
	'DrawTrace':DrawTrace,
	'Circle': OverlayCircle,
	'ClearCircles': ClearCircles,
	'Clear':Clear}
}


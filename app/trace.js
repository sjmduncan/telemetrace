function MakeTrace(container,canvid,ClickCallback,zoomcallback){
    var svg=d3.select(container).append('svg')
	.attr("id", canvid)
    	.attr("class", 'trace')
	.on('mousedown', mDown)
	.on('mouseup', mUp)
	.on('mousemove', mMove)
	//.on('mouseout', mUp)// this randomly fires for no fucking reason

    var size
    var lines  = []
    var margin = 15
    var axiswidth=25
    var xdown,xup
    var hodl=false
    var mRight=false
    var zoomp=[0,1]

    function ForceXRange(x){
	if(size == undefined) return x
	if(x > size.width-margin)
	    return size.width-margin
	if( x < margin+axiswidth)
	    return margin + axiswidth
	return x
    }
    function mMove(){
	var xm = ForceXRange(d3.mouse(this)[0])
	if(hodl && !mRight){
	    Click(xm)
	}if(hodl && mRight){

	    Click(xm)
	    VertLine(xdown, 'keep')
	}
    }
    function mUp(){
	hodl=false
	xup=ForceXRange(d3.mouse(this)[0])
	if(mRight){
	    if(zoomp[1] - zoomp[0] < 1){
		zoomcallback([0,1])
	    }
	    else if(Math.abs(xdown-xup) < 3){
		Click(xup)
	    }else{
		var w = size.width-margin-margin-axiswidth
		// Zoom the traces!
		var z=[
		    (Math.min(xup,xdown)-margin-axiswidth)/w,
		    (Math.max(xup,xdown)-margin-axiswidth)/w]
		zoomcallback(z)
	    }


	}else{
	    Click(xup)
	}
    }

    function mDown(){
	hodl=true
	if(d3.event.button == 2){
	    mRight=true
	}else{
	    mRight=false
	}
	xdown=ForceXRange(d3.mouse(this)[0])
    }

    function Click(x){
	
	x=Math.max(
	    x,
	    margin+axiswidth)
	x=Math.min(
	    x,
	    size.width-margin)
	var xper = (x-margin-axiswidth)/(size.width-margin-margin-axiswidth)
	if(xper > 1) xper = 1
	xper=xper*(zoomp[1]-zoomp[0])+zoomp[0]
	ClickCallback(x, xper)
    }
        
    function AddTrace(data, id, keys, classname){
	var exists=false
	lines.forEach(function(l){
	    if(l.id == id)
		exists=true;
	})
	if(!exists){
	    size=svg.node().parentNode.getBoundingClientRect()
	    var line={
		'id': id,
		'data': data,
		'keys': keys,
		'classname' : classname,
		'extent':{
		    'x': d3.extent(data,
				   function(d){return d[keys.x]}),
		    'y': d3.extent(data,
				   function(d){return d[keys.y]})
		},
		'zoom':[
		    IndexOfDist(data, zoomp[0]*data[data.length-1].Distance),
		    IndexOfDist(data, zoomp[1]*data[data.length-1].Distance)]

	    }
	    lines.push(line)
	    Redraw()
	}
    }
    
    function UpdateAxes(y){
	if(svg.selectAll(".yaxis").empty()){
	    svg.append("g")
		.attr("class", "yaxis")
		.call(d3.axisLeft(y))
		.attr('transform','translate('+(axiswidth+margin)+',0)')
	}else{
	    svg.selectAll(".yaxis")
		.call(d3.axisLeft(y))
	    
	}
    }

    function CalcYExtent(){
	var exty=d3.extent(
	    lines[0].data,
	    function(d){return d[lines[0].keys.y]})

	for(var i=1; i<lines.length; i++){
	    var nexty=
		d3.extent(lines[i].data,
			  function(d){
			      return  d[lines[i].keys.y]
			  })
	    exty[0]=Math.min(nexty[0],exty[0])
	    exty[1]=Math.max(nexty[1],exty[1])
	}
	
	return exty;
	
    }

    
    function Redraw(){
	if(lines.length < 1)
	    return
	// Calculate the Y-scale that will display data for all of the
	// traces
	var exty=CalcYExtent()
	var y=d3.scaleLinear().range([size.height-margin,margin])
	y.domain(exty)
	UpdateAxes(y)

	for(var i=0; i<lines.length; i++){
	    var l=lines[i]
	    
	    // The X-domain currently needs to have its own scale or
	    // else things won't align. FIXME: fix this
	    var x=d3.scaleLinear().range([margin+axiswidth,size.width-margin])
	    var extx=d3.extent(l.data.slice(l.zoom[0],l.zoom[1]), function(d){return d[l.keys.x]})
	    x.domain(extx)
	    
	    var svgpath=d3.line()
	    	.y(function(d){return y(d[l.keys.y])})
		.x(function(d){return x(d[l.keys.x])})

	    var path = svg.select('path#'+l.id)
	    if(path.empty()){
		var g=svg.append('g')
		    .attr('id', l.id)
		    .attr('class', l.classname)
		
		g.append('path')
	    	    .data([l.data.slice(l.zoom[0],l.zoom[1])])
		    .attr("class", l.classname)
		    .attr('id', l.id)
		    .attr("d", svgpath)
	    }else{
		path.data([l.data.slice(l.zoom[0],l.zoom[1])])
		    .attr('d', svgpath)
	    }

	}

    }
    function IndexOfDist(data, d){
	for(var i=0; i<data.length; i++){
	    if(data[i].Distance >= d)
		return i
	}
	return -1
    }
    function Zoom(percent){
	zoomp=percent
	lines.forEach(function(l){
	    l.zoom[0]=IndexOfDist(l.data, zoomp[0]*l.data[l.data.length-1].Distance)
	    l.zoom[1]=IndexOfDist(l.data, zoomp[1]*l.data[l.data.length-1].Distance)
	})
	VertLine(0,'none')
	Redraw()
    }
    function RemoveTrace(tid){
	for(var i=0; i< lines.length; i++){
	    if(lines[i].id==tid){
		svg.select("g#"+tid).remove()
		lines.splice(i,1)
	    }
	}
	if(lines.length > 0) // Check if there's anything to draw otherwise this will fail
	    Redraw()
    }
    function Clear(){
	while(lines.length>0){
	    RemoveTrace(lines[0].id)
	}
	
	    
    }
    function VertLine(x, keep){
	if(keep == undefined || keep=='none')
	    svg.selectAll('#vertLine').remove()
	if(keep != 'none')
	    if(x>0){
		svg.append('g')
		    .attr('id','vertLine')
		    .append('line')
		    .attr('x1', x)
		    .attr('x2', x)
		    .attr('y1', 0)
		    .attr('y2', size.height)
		    .style('stroke-width', 1)
		    .style('stroke', '#3a3a3a')
		    .attr('id', 'hiline')
		
	    }
    }
    return {
	'AddTrace':AddTrace,
	'RemoveTrace':RemoveTrace,
	'Zoom': null,
	'Clear':Clear,
	'VertLine':VertLine,
	'Zoom':Zoom

    }
}


function MakeToggles(){
    var toggles=d3.select("#toggles")
    var selected;

    var clickCallback
    var classes = 'tipitem toggler'
    function SelectToggle(id){
		if(selected != undefined){
			toggles.select('#'+selected).attr('class', 'toggler')
		}
		toggles.select('#'+id).attr('class', classes+ ' tselected')
		selected=id
    }
    function ToggleClicked(){
		SelectToggle(this.id)
		if(clickCallback != undefined)
			clickCallback(selected)
    }
    function AddToggle(key, title){
		toggles.append('button')
			.attr('class', classes)
			.attr('id', key)
			.on('click', ToggleClicked)
			.text(title)
    }
    function GetSelected(){
		return  selected
    }
    var thingsToToggle = [{
	'Key':'Speed',
	'Title':'Speed'
    },{
	'Key':'Time',
	'Title':'Time'
//    },{
//	'Key':'BrakePress',
//	'Title':'Brake'
    },{
	
	'Key':'BrakePressTPS',
	'Title':'Brake/TPS'
//    },{
//	'Key':'TPS',
//	'Title':'TPS'
    },{
	'Key':'RPM',
	'Title':'RPM'
    }]
    thingsToToggle.forEach(function(t){
		AddToggle(t.Key, t.Title)})

	SelectToggle('BrakePressTPS')
	
    function SetCallback(callback){
		clickCallback=callback
    }
    return {'Selected':GetSelected,'SetCallback':SetCallback}
}

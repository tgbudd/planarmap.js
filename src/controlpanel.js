var CMap = CMap || {};

CMap.ControlPanel = function(containerid){
	"use strict";
	var control = {};
	var container = d3.select(containerid);
	
	control.addPanel = function(id,title,startclosed,onchange){
		onchange = defaultFor(onchange,function(){});
		var panel = {};
		var closed = startclosed;
		var paneldiv = container.append("div")
			.attr("class","panel")
			.classed({"closed":closed});
		paneldiv.append("h2")
			.text(title)
			.on("click",function(){
				closed = !closed;
				paneldiv.classed({"closed":closed});
			});
			
		panel.addSlider = function(label,id,setget,min,max,step){
			var p = paneldiv.append("p");
			var valuespan = p.append("label")
				.attr("for",id+"slider")
				.text(label + ": ")
				.append("span");
			valuespan
				.attr("id",id+"label")
				.text(setget())
				
			p.append("input")
				.attr("type","range")
				.attr("class","slider")
				.attr("id",id+"slider")
				.attr("min",min)
				.attr("max",max)
				.attr("step",step)
				.attr("value",setget())
				.on("input",function(){
					var val = +this.value
					setget(val);
					valuespan.text(val);
					onchange();
				});
				
			return panel;
		}
		panel.addToggle = function(labelstr,option1,option2,setget){
			option1 = defaultFor(option1,"Off");
			option2 = defaultFor(option2,"On");
			var label = paneldiv.append("p").append("label")
				.attr("class","switch-light switch-android");
			var checkbox = label.append("input").attr("type","checkbox");
			checkbox.property("checked",true);
			label
				.on("click",function(){

					if( checkbox.property("checked") != setget() )
					{
						console.log( checkbox.property("checked") );
						setget( checkbox.property("checked") );
					}
					onchange();
				});

			var span = label.append("span").text(labelstr);
			span.append("span").text(option1);
			span.append("span").text(option2);
			label.append("a");
			return panel;
		}
		panel.addEmpty = function(){
			return paneldiv.append("p");
		}
		
		return panel;
	}
	
	return control;
}

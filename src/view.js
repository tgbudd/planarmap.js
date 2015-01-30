var CMap = CMap || {};

CMap.View = function(map,targetsvg) {
	"use strict";
	
	var view = {};
	var svg = targetsvg;
	var planarmap = map;
	var globalGroup;
	var backgroundLayer,
		backgroundRect,
		faceLayer,
		cornerLayer,
		edgeLayer,
		helpLineLayer,
		nodeLayer;
		
	var cornersize = 0.5;
	var nodeTextFunction = function(node){
		return node.uid.substring(4);
	}

	function init(){
		svg.selectAll("*").remove();
		
		globalGroup = svg.append("g").attr("id","zoomgroup");

		backgroundLayer = globalGroup.append("g").attr("class","backgroundLayer");
		backgroundRect = backgroundLayer.append("rect")
			.attr("fill","white")
			.attr("width","100%").attr("height","100%").attr("x",0).attr("y",0)

		faceLayer = globalGroup.append("g").attr("class","faceLayer");
		cornerLayer = globalGroup.append("g").attr("class","cornerLayer");
		edgeLayer = globalGroup.append("g").attr("class","edgeLayer");
		helpLineLayer = globalGroup.append("g").attr("class","helpLineLayer");
		nodeLayer = globalGroup.append("g").attr("class","nodeLayer");

		view.updateLayers();
	}
	
	view.nodeText = function(fun){
		nodeTextFunction = fun;
		return view;
	}
	
	view.zoom = function(usezoom){
		usezoom = defaultFor(usezoom,true);
		if( usezoom )
		{
			svg.call(d3.behavior.zoom().on("zoom",function(){
				globalGroup.attr("transform",
					"scale(" + d3.event.scale + ")");
			}));
		} else
		{
			svg.on(".zoom", null);
		}
		return view;
	}
	
	view.updateLayers = function(){
		view.updateFaceLayer();
		view.updateEdgeLayer();
		view.updateNodeLayer();
		return view;
	}
	
	view.updateFaceLayer = function(){
		var facePaths = faceLayer.selectAll("path")
			.data(planarmap.faces().array().filter(function(f) { return !f.layout.outer; }),
			function(f){ return f.uid; });
	
		var newfaces = facePaths.enter().append("path");
		facePaths.each(function(f){
			d3.select(this).classed(f.class);
		});
				
		view.updateFacePositions(newfaces);		
		
		facePaths.exit().remove();
		return view;
	}
	

	view.updateEdgeLayer = function(){
		var edgePaths = edgeLayer.selectAll("path")
			.data(planarmap.edges().array(),
				function(e){return e.uid;});
			
		var newedges = edgePaths.enter().append("path");
		edgePaths.each(function(e){
			d3.select(this).classed(e.class);
		});
		
		view.updateEdgePositions(newedges);
		
		edgePaths.exit().remove();
		return view;
	}
	
	
	view.updateNodeLayer = function()
	{
		var nodeGroups = nodeLayer.selectAll("g.node")
			.data(planarmap.nodes().array(),
				function(n){return n.uid;}
			);
			
		var newNodeGroups = nodeGroups.enter().append("g")
			.attr("class","node");
			
		newNodeGroups.append("circle")
			.attr("r","0.1");

		nodeGroups.select("circle").each(function(n){ 
			d3.select(this).classed(n.class);
		});
		
		newNodeGroups.append("text")
			.attr("dx",0.14)
			.attr("dy",-0.1)
			.attr("class","label")
			.style("text-anchor","start");
			
		nodeGroups.select("text").each(function(n){
			d3.select(this).text(nodeTextFunction(n));
		});
		
		view.updateNodePositions(newNodeGroups);
			
		nodeGroups.exit().remove();
		return view;
	}
	
	function roundCornerPath(path,radius,includeMoveTo)
	{
		includeMoveTo = defaultFor(includeMoveTo,true);
		function coorstr(p) { 
			return p.x + " " + (-p.y);
		}
		var p = (includeMoveTo?"M " + coorstr(path[0]):"");
		
		for(var i=1;i<path.length-1;i++)
		{
			var prev = path[i-1].minus(path[i]);
			var next = path[i+1].minus(path[i]);
			var thisradius = Math.min(radius,Math.min(prev.norm()/2,next.norm()/2));
			prev.normalize().mult(thisradius).addVec(path[i]);
			next.normalize().mult(thisradius).addVec(path[i]);
			p += " L " + coorstr(prev) + " Q " + coorstr(path[i]) + " " + coorstr(next);
		}
		p += " L " + coorstr(path[path.length-1]);
		return p;
	}
	
	view.updateFacePositions = function(faces){
		faces = defaultFor(faces,faceLayer.selectAll("path"));
		
		faces.attr("d",function(d) {
			var first = true;
			return d.edges.map(function(edge){
					var coor = CMap.getVerticesOnEdge(edge,true,true)
						.map(function(v){return v.pos;});
					var path = roundCornerPath(coor, cornersize, first);
					first = false;
					return path;
				}).join(" ");
			});
		return view;
	}
	
	view.updateEdgePositions = function(edges){
		edges = defaultFor(edges,edgeLayer.selectAll("path"));
		
		edges.attr("d", function(edge) {
				var coor = CMap.getVerticesOnEdge(edge.getOriented(),true,true)
					.map(function(v){return v.pos;});
				return roundCornerPath(coor, cornersize);
			});
		return view;
	}
	
	view.updateNodePositions = function(nodegroups){
		nodegroups = defaultFor(nodegroups,nodeLayer.selectAll("g.node"));
		nodegroups.attr("transform", function(d){
			return "translate(" + d.pos.x + "," + (-d.pos.y) + ")";
		});
		return view;
	}
	
	view.updatePositions = function(){
		view.updateFacePositions();
		view.updateEdgePositions();
		view.updateNodePositions();
		return view;
	}
	
	init();
	return view;
}


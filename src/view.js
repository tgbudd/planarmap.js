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
		
	var cornerradius = 0.4;
	var cornersize = 0.5;
	var nodeTextFunction = function(node){
		return node.uid.substring(4);
	}
	
	var allowFaceSelection = true;
	var allowEdgeSelection = true;
	var allowCornerSelection = true;
	var allowNodeSelection = true;
	var faceSelection = [];
	var edgeSelection = [];
	var cornerSelection = [];
	var nodeSelection = [];

	var allowDrag = true;
	var dragbehaviour = d3.behavior.drag()
		.origin(function(d){return d;})
		.on("drag", dragmove)
		.on("dragstart", dragstart)
		.on("dragend", dragend);
	
	function onFaceClick(face) {
		var iscorner = false;
		if( allowCornerSelection ) {
			var relpos = d3.mouse(this);
			var position = new Vec2(relpos[0],-relpos[1]);
			var closest = CMap.pointToCorner(face,position);
			if( closest.distance < cornerradius )
			{
				iscorner = true;
				var name = closest.corner.reversed ?
					"rightcornerselected" : "leftcornerselected";
				if( d3.event.shiftKey ) {
					if( closest.corner.edge.attr[name] ) {
						cornerSelection.splice(
							cornerSelection.indexOf(closest.corner),1);
					} else {
						cornerSelection.push(closest.corner);
					}
					closest.corner.edge.attr[name] = !closest.corner.edge.attr[name];
				} else {
					view.clearSelection();
					closest.corner.edge.attr[name] = true;
					cornerSelection.push(closest.corner);
				}				
			}
		}
		if( !iscorner && !face.layout.outer )
		{
			if( d3.event.shiftKey ) {
				if( face.attr.selected ) {
					faceSelection.splice(faceSelection.indexOf(face),1);
				} else
				{
					faceSelection.push(face);
				}
				face.attr.selected = !face.attr.selected;
			} else {
				view.clearSelection();
				face.attr.selected = true;
				faceSelection.push(face);
			}
		}
		view.updateLayers();
	}
	function onBackgroundClick() {
		onFaceClick.call(this,planarmap.outerface());
	}
	function onEdgeClick(edge) {
		if( d3.event.shiftKey ) {
			if( edge.attr.selected ) {
				edgeSelection.splice(edgeSelection.indexOf(edge),1);
			} else {
				edgeSelection.push(edge);
			}
			edge.attr.selected = !edge.attr.selected;
		} else
		{
			view.clearSelection();
			edge.attr.selected = true;
			edgeSelection.push(edge);
		}
		view.updateLayers();
	}
	function onNodeClick(node) {
		if( d3.event.shiftKey ) {
			if( node.attr.selected ) {
				nodeSelection.splice(nodeSelection.indexOf(node),1);
			} else {
				nodeSelection.push(node);
			}
			node.attr.selected = !node.attr.selected;
		} else
		{
			view.clearSelection();
			node.attr.selected = true;
			nodeSelection.push(node);
		}
		view.updateLayers();
	}
	
	function dragstart(d)
	{
		if( allowDrag ) {
			force.dragforce().drag = true;
			force.dragforce().node = d;

			var relpos = d3.mouse(nodeLayer.node());
			force.dragforce().cursor = new Vec2(relpos[0],-relpos[1]);
			force.resume();
		}
	}
	function dragmove(d)
	{
		if( allowDrag && force.dragforce().drag ) {
			var relpos = d3.mouse(nodeLayer.node());
			force.dragforce().cursor = new Vec2(relpos[0],-relpos[1]);
			force.resume();
		}
	}
	function dragend(d)
	{
		force.dragforce().drag = false;
	}
	
	function init(){
		svg.selectAll("*").remove();
		
		globalGroup = svg.append("g").attr("id","zoomgroup");

		backgroundLayer = globalGroup.append("g").attr("class","backgroundLayer");
		backgroundRect = backgroundLayer.append("rect")
			.attr("fill","white")
			.attr("width",20).attr("height",20).attr("x",-10).attr("y",-10)
			.on("click",onBackgroundClick);

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
			})).on("dblclick.zoom", null);
		} else
		{
			svg.on(".zoom", null);
		}
		return view;
	}
	view.drag = function(usedrag){
		usedrag = defaultFor(usedrag,true);
		if( usedrag )
		{
			dragAllowed = true;
		} else
		{
			dragAllowed = false;
			force.dragforce().drag = false;
		}
		return view;
	}
	view.updateLayers = function(){
		view.updateFaceLayer();
		view.updateEdgeLayer();
		view.updateNodeLayer();
		view.updateCornerLayer();
		return view;
	}
	
	view.updateFaceLayer = function(){
		var facePaths = faceLayer.selectAll("path")
			.data(planarmap.faces().array().filter(function(f) { return !f.layout.outer; }),
			function(f){ return f.uid; });
	
		var newfaces = facePaths.enter().append("path");
		if( allowFaceSelection )
		{
			newfaces.on("click",onFaceClick);
		}
		facePaths.each(function(f){
			d3.select(this).classed(f.class);
			d3.select(this).classed("selected", !!f.attr.selected );
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
		if( allowEdgeSelection )
		{
			newedges.on("click",onEdgeClick);
		}
		edgePaths.each(function(e){
			d3.select(this).classed(e.class);
			d3.select(this).classed("selected", !!e.attr.selected );
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
	
		if( allowNodeSelection )
		{
			newNodeGroups.on("click",onNodeClick);
		}
		newNodeGroups.call(dragbehaviour);

		nodeGroups.select("circle").each(function(n){ 
			d3.select(this).classed(n.class);
			d3.select(this).classed("selected", !!n.attr.selected );
		});
		
		newNodeGroups.append("text")
				.attr("dx",0.14)
				.attr("dy",-0.1)
				.attr("class","label")
				.style("text-anchor","start");
				
		nodeGroups.select("text").each(function(n){
			d3.select(this).text((nodeTextFunction !== undefined ?
				nodeTextFunction(n) : ""));
		});
		
		view.updateNodePositions(newNodeGroups);
			
		nodeGroups.exit().remove();
		return view;
	}
	
	view.updateCornerLayer = function()
	{
		var selectededges = [];
		planarmap.edges().forEach(function(e){
			if( e.attr.leftcornerselected )
			{
				selectededges.push( e.getOriented() );
			}
			if( e.attr.rightcornerselected )
			{
				selectededges.push( e.getOriented(true) );
			}
		});
		var cornerPaths = cornerLayer.selectAll("path")
			.data(selectededges,
				function(e){return e.edge.uid + (e.reversed?"r":"l");});
			
		var newcorners = cornerPaths.enter().append("path");
		
		view.updateCornerPositions(newcorners);
		
		cornerPaths.exit().remove();
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
	
	view.updateCornerPositions = function(corners){
		corners = defaultFor(corners,cornerLayer.selectAll("path"));
		
		corners.attr("d", function(edge) {
			if( edge.isReverse(edge.prev()) )
			{
				// Need full circle: treat as special case.
				return "M " + edge.start().pos.x + " " + -edge.start().pos.y
					+ " m " + -cornerradius + " 0"
					+ " a " + cornerradius + " " + cornerradius + " 0 1 0 "
							+ 2*cornerradius + " 0 "
					+ " a " + cornerradius + " " + cornerradius + " 0 1 0 "
							+ -2*cornerradius + " 0 "
					+ " Z";
			} else
			{
				var tangent1 = CMap.getTangent(edge)
							   .normalize().mult(cornerradius),
					tangent2 = CMap.getTangent(edge.prev().reverse())
							   .normalize().mult(cornerradius);
				return "M " + edge.start().pos.x + " " + -edge.start().pos.y
					+ " l " + tangent1.x + " " + -tangent1.y
					+ " a " + cornerradius + " " + cornerradius + " 0 "
							+ ( tangent1.cross(tangent2) >= 0 ? "0" : "1" ) 
							+ " 0 "	+ (tangent2.x - tangent1.x) + " "	
							+ -(tangent2.y - tangent1.y)				 
					+ " Z";
			}
		});
		
		return view;
	}
	
	view.updatePositions = function(){
		view.updateFacePositions();
		view.updateEdgePositions();
		view.updateNodePositions();
		view.updateCornerPositions();
		return view;
	}
	
	view.getSelection = function(){
		return {faces: faceSelection,
			edges: edgeSelection,
			nodes: nodeSelection,
			corners: cornerSelection};
	}
	view.clearSelection = function(){
		faceSelection.forEach(function(f){
			f.attr.selected = false;			
		});
		faceSelection.splice(0,faceSelection.length);
		edgeSelection.forEach(function(e){
			e.attr.selected = false;
		});
		edgeSelection.splice(0,edgeSelection.length);
		cornerSelection.forEach(function(c){
			if( c.reversed )
			{
				c.edge.attr.rightcornerselected = false;
			} else
			{
				c.edge.attr.leftcornerselected = false;
			}
		});
		cornerSelection.splice(0,cornerSelection.length);
		nodeSelection.forEach(function(n){
			n.attr.selected = false;
		});
		nodeSelection.splice(0,nodeSelection.length);
		view.updateLayers();
	}

	init();
	return view;
}


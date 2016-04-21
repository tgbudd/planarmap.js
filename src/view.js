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
		
	var cornerradius = 7.0;
	var cornersize = 7.0;
	var zoomfactor = 20.0;
	var noderadius = 2.0;
	var nodelabeloffset = [0,0];
	var screenToMapCoor = function(screenvec,y){
		if( Array.isArray(screenvec) )
			return new Vec2(screenvec[0]/zoomfactor,-screenvec[1]/zoomfactor);
		else if( screenvec instanceof Vec2 )
			return new Vec2(screenvec.x/zoomfactor,-screenvec.y/zoomfactor);
		else
			return new Vec2(screenvec/zoomfactor,-y/zoomfactor);
	}
	var mapToScreenCoor = function(mapvec){
		return new Vec2(mapvec.x * zoomfactor,-mapvec.y * zoomfactor);
	}
	
	var nodeTextFunction = function(node){
		return "";
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
			var position = screenToMapCoor(relpos);
			var closest = CMap.pointToCorner(face,position);
			if( closest.distance * zoomfactor < cornerradius )
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
		if( !iscorner && face.layout.outer && !d3.event.shiftKey)
		{
			view.clearSelection();
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
			d3.event.sourceEvent.stopPropagation();
			force.dragforce().drag = true;
			force.dragforce().node = d;

			var relpos = d3.mouse(nodeLayer.node());
			force.dragforce().cursor = screenToMapCoor(relpos);
			force.resume();
		}
	}
	function dragmove(d)
	{
		if( allowDrag && force.dragforce().drag ) {
			var relpos = d3.mouse(nodeLayer.node());
			force.dragforce().cursor = screenToMapCoor(relpos);
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
		
		var defs = svg.append("defs")

		defs.append("marker")
				.attr({
					"id":"arrowend",
					"viewBox":"-2 -5 10 10",
					"refX":13,
					"refY":0,
					"markerWidth":4,
					"markerHeight":4,
					"orient":"auto"
				})
				.append("path")
					.attr("d", "M-2,-5L10,0L-2,5L0,0")
					.attr("class","arrowHead");
		defs.append("marker")
				.attr({
					"id":"arrowstart",
					"viewBox":"-8 -5 10 10",
					"refX":-13,
					"refY":0,
					"markerWidth":4,
					"markerHeight":4,
					"orient":"auto"
				})
				.append("path")
					.attr("d", "M2,-5L-10,0L2,5L0,0")
					.attr("class","arrowHead");

		backgroundLayer = globalGroup.append("g").attr("class","backgroundLayer");
		backgroundRect = backgroundLayer.append("rect")
			.attr("fill","white")
			.attr("width",400).attr("height",400).attr("x",-200).attr("y",-200)
			.on("click",onBackgroundClick);

		faceLayer = globalGroup.append("g").attr("class","faceLayer");
		cornerLayer = globalGroup.append("g").attr("class","cornerLayer");
		edgeLayer = globalGroup.append("g").attr("class","edgeLayer");
		helpLineLayer = globalGroup.append("g").attr("class","helpLineLayer");
		nodeLayer = globalGroup.append("g").attr("class","nodeLayer");

		//view.updateLayers();
	}
	
	view.nodeText = function(fun){
		nodeTextFunction = fun;
		return view;
	}
	
	view.nodeRadius = function(r){
		if (!arguments.length) return noderadius;
		noderadius = r;
		return view;
	}
	view.nodeLabelOffset = function(x){
		if (!arguments.length) return nodelabeloffset;
		nodelabeloffset = x;
		return view;
	}
	
	view.zoom = function(usezoom){
		usezoom = defaultFor(usezoom,true);
		if( usezoom )
		{
			svg.call(d3.behavior.zoom().on("zoom",function(){
				globalGroup.attr("transform",
					"translate(" + d3.event.translate + ") " +
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
	view.updateLayers = function(fullrefresh){
		fullrefresh = defaultFor(fullrefresh,false);
		view.updateFaceLayer(fullrefresh);
		view.updateEdgeLayer(fullrefresh);
		view.updateNodeLayer(fullrefresh);
		view.updateCornerLayer(fullrefresh);
		return view;
	}
	
	view.updateFaceLayer = function(fullrefresh){
		if( fullrefresh )
		{
			faceLayer.selectAll("path").remove();
		}
		var facePaths = faceLayer.selectAll("path")
			.data(planarmap.faces().array().filter(function(f) { return !f.layout.outer; }),
			function(f){ return f.uid; });
	
		var newfaces = facePaths.enter().append("path");
		if( allowFaceSelection )
		{
			newfaces.on("click",onFaceClick);
		}
		facePaths.each(function(f){
			var thiselement = d3.select(this)
				.classed(f.class)
				.classed("selected", !!f.attr.selected );
			if( f.attr.style )
			{
				for(var stylename in f.attr.style)
				{
					thiselement.style(stylename,f.attr.style[stylename]);
				} 
			}
		});
				
		view.updateFacePositions(newfaces);		
		
		facePaths.exit().remove();
		return view;
	}
	

	view.updateEdgeLayer = function(fullrefresh){
		if( fullrefresh )
		{
			edgeLayer.selectAll("path").remove();
		}
		var edgePaths = edgeLayer.selectAll("path")
			.data(planarmap.edges().array(),
				function(e){return e.uid;});
			
		var newedges = edgePaths.enter().append("path");
		if( allowEdgeSelection )
		{
			newedges.on("click",onEdgeClick);
		}
		edgePaths.each(function(e){
			var thiselement = d3.select(this)
				.classed(e.class)
				.classed("selected", !!e.attr.selected );
			if( e.attr.style )
			{
				for(var stylename in e.attr.style)
				{
					thiselement.style(stylename,e.attr.style[stylename]);
				} 
			}
			if( e.attr.marker )
			{
				if( e.attr.marker.end && e.attr.marker.end != "" )
				{
					thiselement.attr("marker-end","url(#" + e.attr.marker.end + "end)");
				} else
				{
					thiselement.attr("marker-end","null");
				}
				if( e.attr.marker.start && e.attr.marker.start != ""  )
				{
					thiselement.attr("marker-start","url(#" + e.attr.marker.start + "start)");
				} else
				{
					thiselement.attr("marker-start","null");
				}
			}
		});
		
		view.updateEdgePositions(newedges);
		
		edgePaths.exit().remove();
		return view;
	}
	
	
	view.updateNodeLayer = function(fullrefresh)
	{
		if( fullrefresh )
		{
			nodeLayer.selectAll("g.node").remove();
		}
		var nodeGroups = nodeLayer.selectAll("g.node")
			.data(planarmap.nodes().array(),
				function(n){return n.uid;}
			);
			
		var newNodeGroups = nodeGroups.enter().append("g")
			.attr("class","node");
			
		newNodeGroups.append("circle")
			.attr("r",noderadius);
	
		if( allowNodeSelection )
		{
			newNodeGroups.on("click",onNodeClick);
		}
		newNodeGroups.call(dragbehaviour);

		nodeGroups.select("circle").each(function(n){ 
			var thiselement = d3.select(this)
				.classed(n.class)
				.classed("selected", !!n.attr.selected );
			if( n.attr.style )
			{
				for(var stylename in n.attr.style)
				{
					thiselement.style(stylename,n.attr.style[stylename]);
				} 
			}
		});
		
		newNodeGroups.append("text")
				.attr("dx",nodelabeloffset[0])//2.8)
				.attr("dy",nodelabeloffset[1])//-2)
				.attr("class","label")
				.style("text-anchor","middle");
				
		nodeGroups.select("text").each(function(n){
			d3.select(this).text((nodeTextFunction !== undefined ?
				nodeTextFunction(n) : ""));
		});
		
		view.updateNodePositions(newNodeGroups);
			
		nodeGroups.exit().remove();
		return view;
	}
	
	view.updateCornerLayer = function(fullrefresh)
	{
		if( fullrefresh )
		{
			cornerLayer.selectAll("path").remove();
		}
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
			return p.x + " " + p.y;
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
						.map(function(v){return mapToScreenCoor(v.pos);});
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
					.map(function(v){return mapToScreenCoor(v.pos);});
				return roundCornerPath(coor, cornersize);
			});
		return view;
	}
	
	view.updateNodePositions = function(nodegroups){
		nodegroups = defaultFor(nodegroups,nodeLayer.selectAll("g.node"));
		nodegroups.attr("transform", function(d){
			var coor = mapToScreenCoor(d.pos);
			return "translate(" + coor.x + "," + coor.y + ")";
		});
		return view;
	}
	
	view.updateCornerPositions = function(corners){
		corners = defaultFor(corners,cornerLayer.selectAll("path"));
		function coorstr(p) { 
			return p.x + " " + p.y;
		}
		corners.attr("d", function(edge) {
			if( edge.isReverse(edge.prev()) )
			{
				// Need full circle: treat as special case.
				return "M " + coorstr(mapToScreenCoor(edge.start().pos))
					+ " m " + -cornerradius + " 0"
					+ " a " + cornerradius + " " + cornerradius + " 0 1 0 "
							+ 2*cornerradius + " 0 "
					+ " a " + cornerradius + " " + cornerradius + " 0 1 0 "
							+ -2*cornerradius + " 0 "
					+ " Z";
			} else
			{
				var tangent1 = mapToScreenCoor(CMap.getTangent(edge))
							   .normalize().mult(cornerradius),
					tangent2 = mapToScreenCoor(CMap.getTangent(edge.prev().reverse()))
							   .normalize().mult(cornerradius);
				return "M " + coorstr(mapToScreenCoor(edge.start().pos))
					+ " l " + coorstr(tangent1)
					+ " a " + cornerradius + " " + cornerradius + " 0 "
							+ ( tangent1.cross(tangent2) <= 0 ? "0" : "1" ) 
							+ " 0 "	+ coorstr(tangent2.minus(tangent1)) 
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
	view.addToSelection = function(obj){
		if( obj instanceof CMap.Node && !obj.attr.selected )
		{
			obj.attr.selected = true;
			nodeSelection.push(obj);
		}
		if( obj instanceof CMap.Edge && !obj.attr.selected )
		{
			obj.attr.selected = true;
			edgeSelection.push(obj);
		}
		if( obj instanceof CMap.Face && !obj.attr.selected )
		{
			obj.attr.selected = true;
			faceSelection.push(obj);
		}
		if( obj instanceof CMap.OrientedEdge )
		{
			if( obj.reversed )
			{
				if( !obj.edge.attr.rightcornerselected )
				{
					obj.edge.attr.rightcornerselected = true;
					cornerSelection.push(obj);
				}
			} else
			{
				if( !obj.edge.attr.leftcornerselected )
				{
					obj.edge.attr.leftcornerselected = true;
					cornerSelection.push(obj);
				}
			}
		}
	}
	view.addFaceSelection = function(fun){
		planarmap.faces().forEach(function(f){
			if( fun(f) )
			{
				f.attr.selected = true;
			}
		})
	}

	init();
	return view;
}


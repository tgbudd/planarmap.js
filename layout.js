var CMap = CMap || {};

CMap.AuxiliaryVertex = function(vec) {
	this.pos = vec;
	this.attemptremoval = false;
}
CMap.AuxiliaryVertex.prototype.copy = function() {
	return new CMap.AuxiliaryVertex(this.pos);
}
CMap.EdgeLayout = function() {
	this.vert = [];
}
CMap.EdgeLayout.prototype.copy = function() {
	var el = new CMap.EdgeLayout();
	el.vert = this.vert.map(function(n){n.copy();});
	return el;
}
CMap.getVerticesOnEdge = function(orientededge,includefirst,includelast) {
	includefirst = defaultFor(includefirst,true);
	includelast = defaultFor(includelast,true);
	var vert = [];
	if( includefirst )
	{
		vert.push(orientededge.start());
	}
	if( orientededge.reversed )
	{	
		for(var i=orientededge.edge.layout.vert.length-1;i>=0;i--)
		{
			vert.push(orientededge.edge.layout.vert[i]);
		}
	} else
	{
		orientededge.edge.layout.vert.forEach(function(v){
			vert.push(v);
		});
	}
	if( includelast )
	{
		vert.push(orientededge.end());
	}
	return vert;
}
CMap.getTangent = function(orientededge) {
	if( orientededge.edge.layout.vert.length = 0 )
	{
		return orientededge.end().pos.minus(orientededge.start().pos);
	}
	if( orientededge.reversed )
	{
		return orientededge.edge.layout.vert[
			orientededge.edge.layout.vert.length-1].pos
			.minus(orientededge.start().pos);	
	}
	return orientededge.edge.layout.vert[0].pos
		.minus(orientededge.start().pos);	
}
CMap.getAuxiliaryVertices = function(planarmap){
	return [].concat.apply([],
		planarmap.edges().map(function(edge){
			return CMap.getVerticesOnEdge(edge.getOriented(),false,false);
		}));
}
CMap.getFacePolygon = function(face,startedge) {
	var index = 0;
	if( startedge instanceof CMap.OrientedEdge )
	{
		index = face.edgeIndex(startedge);
	}
	
	var vert = [];
	for(var i=0;i<face.edges.length;i++)
	{
		vert = vert.concat(CMap.getVerticesOnEdge(face.edges[index],true,false));
		index++;
		if( index == face.edges.length ) index = 0;
	}
	return vert;
}
CMap.faceAngleSum = function(face) {
	return CMap.polygonAngleSum(
		CMap.getFacePolygon(face).map(function(v){return v.pos;}));
}
CMap.faceExteriorAngle = function(face) {
	return CMap.polygonExteriorAngle(
		CMap.getFacePolygon(face).map(function(v){return v.pos;}));
}
CMap.faceIsNonSimple = function(face){
	var pol = CMap.getFacePolygon(face)
		.map(function(p){return p.pos});
	return !CMap.polygonIsSimple(pol,face.layout.outer);
}
CMap.planarMapIsNonSimple = function(planarmap) {
	return planarmap.faces().some(CMap.faceIsNonSimple);
}
CMap.forEachVertex = function(planarmap,f) {
	planarmap.nodes().forEach(f);
	planarmap.edges().forEach(function(e){
		e.layout.vert.forEach(f);
	});
}

CMap.LayoutUpdater = function() {
	var updater = {};
	var targetLinkLength = 1;
	var minAuxVertices = 0;
	var shrinkFactor = 0.7;
	
	function angleSection(prev,center,next,n,r)
	{
		var angle = 2*Math.PI;
		if( prev != next )
		{
			angle = next.minus(center).anglePos(prev.minus(center));
		}
		var radial = next.minus(center).normalize().mult(r);
		var pt = [];
		for(var i=0;i<n;i++)
		{
			pt.push( radial.copy().rotate((i+1)*angle/(n+1)).addVec(center) );
		}
		return pt;
	}
	
	updater.updaters = {
		"singleEdgeMap": 
		function(edge){
			edge.start.pos = new Vec2(-targetLinkLength/2,0);
			edge.end.pos = new Vec2(targetLinkLength/2,0);
			edge.layout = new CMap.EdgeLayout();
			edge.left.layout.outer = true;
		},
		"insertEdgeNextTo": 
		function(oredge){
			var prevEdge = oredge.prev().reverse();
			var nextEdge = oredge.next().next();
			var vprev = CMap.getVerticesOnEdge(prevEdge);
			var vnext = CMap.getVerticesOnEdge(nextEdge);
			oredge.end().pos = angleSection(
				vprev[1].pos,vprev[0].pos,
				vnext[1].pos,1,targetLinkLength)[0];			
			while( CMap.faceIsNonSimple(oredge.left()) )
			{
				oredge.end().pos = oredge.start().pos.plus(
					oredge.end().pos.minus(oredge.start().pos)
					.mult(shrinkFactor));
			}
		},	
		"insertDiagonal":
		function(edge,comments){
			comments = defaultFor(comments,{});
			if( edge.right.edges.length == 1 
				&& (!("outer" in comments) || comments.outer == "right") )
			{
				// new edge is a loop
				var prevEdge = edge.getOriented().prev().reverse();
				var nextEdge = edge.getOriented().next();
				var vprev = CMap.getVerticesOnEdge(prevEdge);
				var vnext = CMap.getVerticesOnEdge(nextEdge);
				var v = angleSection(
					vprev[1].pos,vprev[0].pos,
					vnext[1].pos,2,targetLinkLength);
				edge.layout.vert = [new CMap.AuxiliaryVertex(v[1]),
					new CMap.AuxiliaryVertex(v[0])];			
				while( CMap.faceIsNonSimple(edge.left) )
				{
					edge.layout.vert.forEach(function(v){
						v.pos.subVec(vprev[0].pos).mult(shrinkFactor)
						.addVec(vprev[0].pos);
					});
				}				
			} else
			{
				var coorleft = CMap.getFacePolygon(edge.left,edge.getOriented())
					.map(function(v){return v.pos;}).slice(1);
				var coorright = CMap.getFacePolygon(edge.right,edge.getOriented(true))
					.map(function(v){return v.pos;}).slice(1);
				var pol = coorleft.concat(coorright);
				if( !(edge.left.layout.outer || edge.right.layout.outer) )
				{
					edge.layout.vert = CMap.findPathInPolygon(pol,[coorleft.length,0])
						.map(function(p){return new CMap.AuxiliaryVertex(p)});
				} else
				{
					if( !("outer" in comments) ) {
						if( !CMap.isProperDiagonal(pol,[coorleft.length,0]) )
						{
							edge.layout.vert = CMap.findPathOutsidePolygon(pol,[coorleft.length,0])
								.map(function(p){return new CMap.AuxiliaryVertex(p)});
						}
						if( CMap.faceExteriorAngle(edge.left) < 0 )
						{
							// edge.left is the outer face
							edge.left.layout.outer = true;
							edge.right.layout.outer = false;
						} else
						{
							// edge.right is the outer face
							edge.left.layout.outer = false;
							edge.right.layout.outer = true;
						}
					} else {
						// make sure the outer face is on the left of edge
						// or the right
						edge.layout.vert = CMap.findPathOutsidePolygon(pol,[coorleft.length,0],comments.outer === "left")
								.map(function(p){return new CMap.AuxiliaryVertex(p)});
						edge.left.layout.outer = comments.outer === "left";
						edge.right.layout.outer = comments.outer !== "left";
					}	
				}
			}
		},
		"removeEdge":
		function(data) {
			if( !data.wasDangling && data.oldFace.layout.outer )
			{
				data.cornerEdge.left().layout.outer = true;
			}
		}
	};		
	updater.registerAll = function(planarmap){
		for(type in this.updaters)
		{
			planarmap.onChange(type,this.updaters[type]);
		}
		return this;
	}
	return updater;
}

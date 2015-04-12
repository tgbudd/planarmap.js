var CMap = CMap || {};

CMap.AuxiliaryVertex = function(vec) {
	this.pos = vec;
	this.attemptremoval = false;
}
CMap.AuxiliaryVertex.prototype.copy = function() {
	return new CMap.AuxiliaryVertex(this.pos);
}
CMap.AuxiliaryVertex.prototype.fromJSON = function() {
	this.pos = new Vec2(this.pos.x,this.pos.y);
}
CMap.AuxiliaryVertex.prototype.toJSON = function() {
	return {
		pos: this.pos,
		attemptremoval: this.attemptremoval
	};
}
CMap.EdgeLayout = function() {
	this.vert = [];
}
CMap.EdgeLayout.prototype.copy = function() {
	var el = new CMap.EdgeLayout();
	el.vert = this.vert.map(function(n){n.copy();});
	return el;
}
CMap.EdgeLayout.prototype.fromJSON = function() {
	this.vert.forEach(function(v){ 
		v.__proto__ = CMap.AuxiliaryVertex.prototype;
		v.fromJSON();
	});
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
CMap.popAuxiliaryVertex = function(orientededge) {
	if( orientededge.reversed )
	{
		return orientededge.edge.layout.vert.splice(0,1)[0];
	}
	return orientededge.edge.layout.vert.pop();
}
CMap.pushAuxiliaryVertex = function(orientededge,v) {
	if( orientededge.reversed )
	{
		orientededge.edge.layout.vert.splice(0,0,v);
	} else
	{
		orientededge.edge.layout.vert.push(v);
	}
}
CMap.getTangent = function(orientededge) {
	if( orientededge.edge.layout.vert.length == 0 )
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
CMap.getEdgeLength = function(edge) {
	if( edge instanceof CMap.Edge )
	{
		edge = edge.getOriented();
	}
	var vert = CMap.getVerticesOnEdge(edge,true,true);
	var length = 0;
	for(var i=0;i<vert.length-1;i++)
	{
		length += vert[i].distance(vert[i+1]);
	}
	return length;
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
	var onchange = function(){};
	
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
			onchange();
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
			onchange();
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
			onchange();
		},
		"removeEdge":
		function(data) {
			if( !data.wasDangling && data.oldFace.layout.outer )
			{
				data.cornerEdge.left().layout.outer = true;
			}
			onchange();
		},
		"splitEdge":
		function(orientededge) {
			var vert = CMap.getVerticesOnEdge(orientededge,false,false);
			if( vert.length == 0 )
			{
				orientededge.end().pos = orientededge.next().end().pos
					.plus(orientededge.start().pos).mult(0.5);
			} else
			{
				var prevvert = orientededge.start().pos;
				var length = 0;
				vert.forEach(function(v){
					length += prevvert.distance(v.pos);
					prevvert = v.pos;
				});
				length += prevvert.distance(orientededge.next().end().pos);
				var targetlength = 0.5*length;
				var mindist = length;
				var closestindex;
				prevvert = orientededge.start().pos;
				length = 0;
				vert.forEach(function(v,i){
					length += prevvert.distance(v.pos);
					if( Math.abs(length - targetlength) < mindist )
					{
						mindist = Math.abs(length - targetlength);
						closestindex = i;
					}
					prevvert = v.pos;
				});	
				
				orientededge.end().pos = vert[closestindex].pos;
				// Move the rest of the auxiliary vertices to orientededge.next()
				while( true )
				{
					var movevert = CMap.popAuxiliaryVertex(orientededge);
					if( movevert == vert[closestindex] )
					{
						break;
					}
					CMap.pushAuxiliaryVertex(orientededge.next().reverse(),
						movevert);
				}
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
	
	updater.attemptStretch = function(planarmap){
		planarmap.edges().forEach(function(e){
			var prev = e.start;
			var removeindex;
			if( e.layout.vert.some(function(v,i){
				var next = (i==e.layout.vert.length-1 ? e.end : e.layout.vert[i+1]);
				var bendangle = next.pos.minus(v.pos)
					.angle(v.pos.minus(prev.pos));
				if( Math.abs(bendangle) < 0.2 ){
					removeindex = i;
					return true;
				}
				prev = v;
				return false;
			}) ) {
				var removed = e.layout.vert.splice(removeindex,1)[0];
				if( CMap.faceIsNonSimple(e.left) || 
					CMap.faceIsNonSimple(e.right) )
				{
					e.layout.vert.splice(removeindex,0,removed);
					console.log( "failed to remove aux. vert");
				}else{		
					console.log( "removed aux. vert");
				}
			}
		});
	}
	updater.onChange = function(fun){
		onchange = fun;
	}
	return updater;
}

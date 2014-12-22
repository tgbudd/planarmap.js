var CMap = CMap || {};

CMap.AuxiliaryVertex = function(vec) {
	this.pos = vec;
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
			if( prevEdge.isEqual(nextEdge) )
			{
				// the node at which oredge starts
				// is a bivalent node
				var v = CMap.getVerticesOnEdge(nextEdge);
				oredge.end().pos = v[0].copy().addVec(
					v[0].copy().subVec(v[1]).normalize()
					.mult(this.targetLinkLength));
			}else
			{
				var vprev = CMap.getVerticesOnEdge(prevEdge);
				var vnext = CMap.getVerticesOnEdge(nextEdge);
				oredge.end().pos = vprev[0].pos.plus(
					vnext[1].pos.minus(vnext[0].pos)
					.getBisector(vprev[1].pos.minus(vprev[0].pos))
					.mult(targetLinkLength));
			}
			while( CMap.faceIsNonSimple(oredge.left()) )
			{
				oredge.end().pos = oredge.start().pos.plus(
					oredge.end().pos.minus(oredge.start().pos)
					.mult(shrinkFactor));
			}
		},	
		"insertDiagonal":
		function(edge){
			var coorleft = CMap.getFacePolygon(edge.left,edge.getOriented())
				.map(function(v){return v.pos;}).splice(0,1);
			var coorright = CMap.getFacePolygon(edge.right,edge.getOriented(true))
				.map(function(v){return v.pos;}).splice(0,1);
			var pol = coorleft.concat(coorright);
			if( !(edge.left.layout.outer || edge.right.layout.outer) )
			{
				edge.layout.vert = CMap.findPathInPolygon(pol,[coorleft.length,0])
					.map(function(p){return new CMap.AuxiliaryVertex(p)});
			} else
			{
				if( !CMap.isProperDiagonal(pol,[coorleft.length,0]) )
				{
					edge.layout.vert = CMap.findPathOutsidePolygon(pol,[coorleft.length,0])
						.map(function(p){return new CMap.AuxiliaryVertex(p)});
				}
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

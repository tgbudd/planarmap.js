var CMap = CMap || {};

CMap.AuxiliaryVertex = function(vec) {
	var pos = vec;
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
CMap.getFacePolygon = function(face) {
	return [].concat.apply([],
		face.edges.map(function(e){
			return CMap.getVerticesOnEdge(e,true,false);
		}));
}
CMap.faceIsNonSimple = function(face){
	var pol = CMap.getFacePolygon(face)
		.map(function(p){return p.pos});
	return !CMap.polygonIsSimple(pol,face.layout.outer);
}
CMap.planarMapIsNonSimple = function(planarmap) {
	return planarmap.faces().some(CMap.faceIsNonSimple);
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
				oredge.end().pos = vprev[0].copy().addVec(
					vnext[1].copy().subVec(vnext[0])
					.getBisector(vprev[1].copy().subvec(vprev[0]))
					.mult(targetLinkLength));
			}
			while( CMap.faceIsNonSimple(oredge.left()) )
			{
				oredge.end().pos = oredge.start().pos.copy().addVec(
					oredge.end().pos.copy().subVec(oredge.start().pos)
					.mult(shrinkFactor));
			}
		},	
		"insertDiagonal":
		function(edge){
			
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

var CMap = CMap || {};

CMap.AuxiliaryVertex = function(vec) {
	var pos = vec;
}
CMap.AuxiliaryVertex.prototype.copy = function() {
	return new CMap.AuxiliaryVertex(this.pos);
}
CMap.EdgeLayout = function() {
	var vert = [];
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
		vert.push(orientededge.start().pos);
	}
	if( orientededge.reversed )
	{	
		for(var i=orientededge.edge.layout.vert.length-1;i>=0;i--)
		{
			vert.push(orientededge.edge.layout.vert[i].pos);
		}
	} else
	{
		orientededge.edge.layout.vert.forEach(function(v){
			vert.push(v.pos);
		});
	}
	if( includelast )
	{
		vert.push(orientededge.end().pos);
	}
}
CMap.getFacePolygon = function(face) {
	return [].concat.apply([],
		face.edges.map(function(e){
			return CMap.getVerticesOnEdge(e,true,false);
		}));
}
CMap.faceIsNonSimple = function(face){

	var angle = CMap.polygonAngleSum(CMap.getFacePolygon(face));
	if( face.outer )
	{
		if( Math.abs(angle-(face.links.length+2)*Math.PI) > 0.1 )
			return true;
	}else
	{
		if( Math.abs(angle-(face.links.length-2)*Math.PI) > 0.1 )
			return true;
	}
	if( face.links.length == 3 )
	{
		return false;
	}
	
	var eventQueue = [];
	var uniquelinks = {};
	face.links.forEach(function(l){
		if( !uniquelinks[l.id] )
		{
			uniquelinks[l.id] = true;
			eventQueue.push({p: nodes[links[l.id][0]].pos, p2: nodes[links[l.id][1]].pos, link: l, 
				left: nodes[links[l.id][0]].pos.x <= nodes[links[l.id][1]].pos.x});
			eventQueue.push({p: nodes[links[l.id][1]].pos, p2: nodes[links[l.id][0]].pos, link: l,
				left: !(nodes[links[l.id][0]].pos.x <= nodes[links[l.id][1]].pos.x)});
		}
	});
	eventQueue.sort(function(a,b){ return (a.p==b.p? a.p2.x-b.p2.x : a.p.x-b.p.x); });
	
	var sweepLine = [];
	return eventQueue.some(function(e){
		if( e.left )
		{
			var position = 0;
			if( sweepLine.some(function(s,i){ position=i; return (s.p == e.p ? 
					(s.p2.y - s.p.y)*(e.p2.x-e.p.x) >= (e.p2.y - e.p.y)*(s.p2.x-s.p.x) : s.p.y >= e.p.y); }) ) {
				sweepLine.splice(position,0,e);
			} else
			{
				sweepLine.push(e);
				position = sweepLine.length-1;
			}
			if( position > 0 && CMap.segmentsIntersect([e.p,e.p2],[sweepLine[position-1].p,sweepLine[position-1].p2]) )
				return true;
			if( position < sweepLine.length-1 && CMap.segmentsIntersect([e.p,e.p2],
								[sweepLine[position+1].p,sweepLine[position+1].p2]) )
				return true;
		} else
		{
			var position = 0;
			sweepLine.some(function(s,i){ position=i; return s.link == e.link; });
			sweepLine.splice(position,1);
			if( position > 0 && position < sweepLine.length &&
				CMap.segmentsIntersect( [sweepLine[position].p,sweepLine[position].p2], 
										[sweepLine[position-1].p,sweepLine[position-1].p2] ) )
				return true;
		}
	});
};


CMap.LayoutUpdater = function() {
	var targetLinkLength = 1;
	var minAuxVertices = 0;
	var shrinkFactor = 0.7;
	
	var updaters = {
		"singleEdgeMap": 
		function(edge){
			edge.start.pos = new Vec2(-targetLinkLength/2,0);
			edge.end.pos = new Vec2(targetLinkLength/2,0);
			edge.layout = new CMap.EdgeLayout();
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
					.mult(targetLinkLength));
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
	function registerAll(planarmap){
		for(type in updaters)
		{
			planarmap.on(type,updaters[type]);
		}
		return this;
	}
}

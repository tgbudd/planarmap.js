var Vec2 = function(x,y)
{
	this.x = x;
	this.y = y;
};

Vec2.prototype.addVec = function(vec){ 
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	this.x += vec.x; 
	this.y += vec.y; 
	return this; 
};
Vec2.prototype.plus = function(vec){
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	return new Vec2(this.x+vec.x,this.y+vec.y);
}
Vec2.prototype.subVec = function(vec){ 
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	this.x -= vec.x; 
	this.y -= vec.y; 
	return this; 
};
Vec2.prototype.minus = function(vec){
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	return new Vec2(this.x-vec.x,this.y-vec.y);
}
Vec2.prototype.distance = function(vec){
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	return this.minus(vec).norm();
}
Vec2.prototype.mult = function(r) { 
	this.x *= r; 
	this.y *= r; 
	return this; 
};
Vec2.prototype.divide = function(r) { 
	return this.mult(1/r); 
};
Vec2.prototype.dot = function(vec) { 
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	return (this.x*vec.x+this.y*vec.y); 
};
Vec2.prototype.cross = function(vec) { 
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	return (this.x*vec.y-this.y*vec.x); 
};
Vec2.prototype.angle = function(vec) {
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	// Returns the angle (between -PI and PI) this has to be rotated in
	// counterclockwise direction to align it with vec_. 
	return Math.atan2(this.cross(vec),this.dot(vec));
};
Vec2.prototype.anglePos = function(vec) {
	console.assert(vec instanceof Vec2 && isFinite(vec.x) && isFinite(vec.y));
	// Returns the angle (between 0 and 2 PI) this has to be rotated in
	// counterclockwise direction to align it with vec_. 
	var angle = this.angle(vec);
	return (angle < 0 ? angle + 2*Math.PI : angle);
};
Vec2.prototype.rotate = function(angle) { 
	var cosine = Math.cos(angle);
	var sine = Math.sin(angle);
	var tmpx = cosine * this.x - sine * this.y;
	this.y = sine * this.x + cosine * this.y;
	this.x = tmpx;
	return this;	
};
Vec2.prototype.rotate90 = function() { 
	var tmpx = - this.y;
	this.y = this.x;
	this.x = tmpx;
	return this;	
};
Vec2.prototype.norm = function() { 
	return Math.sqrt(this.dot(this)); 
};
Vec2.prototype.normSq = function() { 
	return this.dot(this); 
};
Vec2.prototype.normalize = function() { 
	var n = this.norm(); return this.divide(n); 
};
Vec2.prototype.zero = function() { 
	this.x=0;this.y=0; return this; 
};
Vec2.prototype.copy = function() { 
	return new Vec2(this.x,this.y); 
};
/* Returns true if the angular direction of this is in the counterclockwise order between v1 and v2 */
Vec2.prototype.isInBetween = function(v1,v2) {
	var angle1 = v1.anglePos(this);
	var angle2 = v1.anglePos(v2);
	return angle1 > 0 && angle1 < angle2;
}
// Return a unit vector that bisects the angle between this vector and v in ccw order
// If the angle is zero return this.norm()
Vec2.prototype.getBisector = function(v) {
	return this.copy().normalize().rotate(0.5*this.anglePos(v));
}

var CMap = CMap || {};

/*
	Input:
		line1, line2 - Arrays of two Vec2's 
		ignoreEndPoints - if true line1 and line2 may share an end point
	Output:
		returns true when they intersect (in their interior)
*/
CMap.segmentsIntersect = function( line1, line2, ignoreEndPoints ){
	ignoreEndPoints = defaultFor(ignoreEndPoints,true);

	if( !ignoreEndPoints && 
		(line1[0] == line2[0] || line1[0] == line2[1]
		|| line1[1] == line2[0] || line1[1] == line2[1] ) )
	{
		return true;
	}

	var v1 = line1[1].copy().subVec(line1[0]);
	var v2 = line2[1].copy().subVec(line2[0]);
	var cross = v1.cross(v2);
	if( ignoreEndPoints && (line1[0] == line2[0] || line1[0] == line2[1]
		|| line1[1] == line2[0] || line1[1] == line2[1]) )
	{
		if( cross == 0 )
		{
			// check whether they do not overlap
			if( line1[0] == line2[0] || line1[1] == line2[1] )
			{
				return v1.dot(v2) >= 0;
			}
			if( line1[1] == line2[0] ||	line1[0] == line2[1] )
			{
				return v1.dot(v2) <= 0;
			}
		} else
		{
			return false;
		}	
	}
	var d0 = line2[0].copy().subVec(line1[0]);
	if( cross == 0 )
	{
		// check whether they do not overlap
		if( d0.cross(v1) == 0 )
		{
			var min0 = Math.min( 0, v1.dot(v1) ),
				max0 = Math.max( 0, v1.dot(v1) ),
				min1 = v1.dot(d0) + Math.min( 0, v1.dot(v2) ),
				max1 = v1.dot(d0) + Math.max( 0, v1.dot(v2) );
			return (max1 >= max0 && min1 <= max0) || (min1 <= min0 && max1 >= min0 );
		} else
		{
			return false;
		}
	}
	var between01 = function(x){return 0 <= x && x <= 1;}
	return between01(d0.cross(v2)/cross) && between01(d0.cross(v1)/cross); 
}

CMap.pointSegmentDistance = function(pt,line) {
	var dir = line[1].copy().subVec(line[0]);
	var ptvec = pt.copy().subVec(line[0]);
	var dot = dir.dot(ptvec);
	if( dot <= 0 )
	{
		return ptvec.norm();
	} else if( dot >= dir.normSq() )
	{
		return pt.copy().subVec(line[1]).norm();
	}
	return Math.abs( dir.normalize().cross(ptvec) );
}

/*
	input:
		facecoor - an array of Vec2's representing the vertices
		diagIds - an array of two indices of facecoor representing the diagonal
	Note that equality of points is established by comparing objects,
	so make sure not to provide copies of the same Vec2's.
	
	output:
		Returns true when the diagonal divides the polygon into
		two simple polygons.
*/
CMap.isProperDiagonal = function(facecoor,diagIds,mindist){
	mindist = defaultFor(mindist,0.0001);
	var next = function(i) { return (i+1)%facecoor.length; };
	var prev = function(i) { return (i+facecoor.length-1)%facecoor.length; };
	var line = [facecoor[diagIds[0]],facecoor[diagIds[1]]];

	if( facecoor.some(function(c){
			return c != line[0] && c != line[1]	&& CMap.pointSegmentDistance(c,line) < mindist;
		}) ) {
		return false;
	}

	// Check that the directions are inward
	if( !CMap.isIngoingDirection(facecoor,diagIds[0],facecoor[diagIds[1]]) || 
		!CMap.isIngoingDirection(facecoor,diagIds[1],facecoor[diagIds[0]]) )
	{
		return false;
	}
	
	for(var i=0;i<facecoor.length;i++)
	{
		if( CMap.segmentsIntersect( [facecoor[i],facecoor[next(i)]], line) )
			return false;
	}
	return true;
}

CMap.isIngoingDirection = function(facecoor,corner,pt){
	var next = (corner+1)%facecoor.length;
	var prev = (corner+facecoor.length-1)%facecoor.length;

	// Check that the direction is inward
	return facecoor[next]==facecoor[prev] || 
			pt.copy().subVec(facecoor[corner]).isInBetween(
			facecoor[next].copy().subVec(facecoor[corner]),
			facecoor[prev].copy().subVec(facecoor[corner]) ); 
}

CMap.pointInPolygon = function(coor,pt){
	if( coor.some(function(c){return c==pt;}) )
	{
		return false;
	}
	var angle = 0;
	var prev = coor[coor.length-1].copy().subVec(pt);
	coor.forEach(function(c){ 
		var cur = c.copy().subvec(pt);
		angle += prev.angle(cur);
		prev = cur;
	});
	return Math.abs(angle - 2*Math.PI) < 0.001;
}

CMap.segmentInPolygon = function(coor,line,checkinpolygon,mindist){
	checkinpolygon = defaultFor(checkinpolygon,true);
	mindist = defaultFor(mindist,0.001);
	
	if( coor.some(function(c){
			return c != line[0] && c != line[1]	&& CMap.pointSegmentDistance(c,line) < mindist;
		}) ) {
		return false;
	}
	if( checkinpolygon && (!pointInPolygon(coor,line[0]) || !pointInPolygon(coor,line[1])) )
	{
		return false;
	}
	for(var i=0;i<coor.length;i++)
	{
		if( CMap.segmentsIntersect( [coor[i],coor[(i+1)%coor.length]], line) )
			return false;
	}
	return true;		
}

/*
	input: coor - array of Vec2 representing corners of a polygon in ccw order
	output: array of pairs of integers representing diagonals of the polygon that
		triangulate it
*/
CMap.triangulatePolygon = function(coor){
	// Use a naive ear cutting algorithm
	var c = coor.map(function(x){return x;});
	var ids = coor.map(function(x,i){return i;});
	var diag = [];
	var cur = 0;
	while( c.length > 3 )
	{ 
		var prevnext = [(cur+c.length-1)%c.length, (cur+1)%c.length];
		if( c[prevnext[0]] != c[prevnext[1]] && CMap.isProperDiagonal(c, prevnext) )
		{
			diag.push([ids[prevnext[0]],ids[prevnext[1]]]);
			c.splice(cur,1);
			ids.splice(cur,1);
			if( prevnext[1] == 0 )
			{
				cur = 0;
			}
		} else
		{
			cur = prevnext[1];
		}
	}
	return diag;
}

CMap.findPathInPolygon = function(coor,cornerIds)
{
	if( coor.length == 3 )
	{
		return [coor[0].plus(coor[1]).plus(coor[2]).divide(3)];
	}
	
	// Take the midpoints of the diagonals of a triangulation
	// of the polygon to be the possible way points. 
	var pt = CMap.triangulatePolygon(coor).map(function(d){
		return coor[d[0]].copy().addVec(coor[d[1]]).mult(0.5);
	});
	pt.splice(0,0,coor[cornerIds[1]],coor[cornerIds[0]]);
	var queue = [0];
	var parent = {"0": -1};

	while( queue.length > 0 )
	{
		var cur = queue[0];
		queue.splice(0,1);
		if(	pt.some(function(p,i){
			if( !(i in parent) )
			{
				if( (cur != 0 || CMap.isIngoingDirection(coor,cornerIds[1],p))
					&& (i != 1 || CMap.isIngoingDirection(coor,cornerIds[0],pt[cur]))
					&& CMap.segmentInPolygon(coor,[pt[cur],p],false) )
				{
					parent[i] = cur;
					queue.push(i);
					return i==1; 
				}
			}
			return false;
		}) )
		{
			break;
		}
	}
	var path = [];
	var cur = parent[1];
	while( cur > 0 )
	{
		path.push(pt[cur]);
		cur = parent[cur];
	}
	return path;
}
CMap.findPathOutsidePolygon = function(coor,cornerIds,outerleft)
{
	// Construct a bounding box
	var boundingbox = {min: new Vec2(-1,-1), max: new Vec2(1,1)};
	coor.forEach(function(p){
		if( p.x < boundingbox.min.x ) boundingbox.min.x = p.x;
		if( p.y < boundingbox.min.y ) boundingbox.min.y = p.y;
		if( p.x > boundingbox.max.x ) boundingbox.max.x = p.x;
		if( p.y > boundingbox.max.y ) boundingbox.max.y = p.y;
	});
	var center = boundingbox.max.plus(boundingbox.min).mult(0.5);
	boundingbox.min.subVec(center).mult(1.4).addVec(center);
	boundingbox.max.subVec(center).mult(1.4).addVec(center);
	var box = [ boundingbox.min, 
				new Vec2(boundingbox.max.x, boundingbox.min.y),
				boundingbox.max,
				new Vec2(boundingbox.min.x, boundingbox.max.y) ];
	
	// Choose the vertex furthest away from the corners c
	var distance = 0;
	var index = 0;
	var normal;
	coor.forEach(function(p,i){
		var d = p.copy().subVec(coor[cornerIds[0]]).norm() 
			  + p.copy().subVec(coor[cornerIds[1]]).norm();
		var next = coor[(i+1)%coor.length];
		var prev = coor[(i+coor.length-1)%coor.length];
		var n = p.minus(prev);
		if( next != prev )
		{
			n = next.minus(p)
						 .getBisector(prev.minus(p));
		}
		if( n.dot(p.minus(coor[cornerIds[0]])) > 0 && d > distance )
		{
			distance = d;
			index = i;
			normal = n;
		}
	});
	
	// Rearrange box to line up with the normal
	if( normal.x <= 0 && normal.y > 0 )
	{
		box.unshift(box.pop());
	} else if( normal.x > 0 )
	{
		box.push(box.shift());
		if( normal.y > 0 )
		{
			box.push(box.shift());
		}
	}
	var newcoor = coor.slice();
	newcoor.splice(index,0,coor[index],
		box[0], box[0].copy().addVec(box[1]).mult(0.5),
		box[1], box[1].copy().addVec(box[2]).mult(0.5),
		box[2], box[2].copy().addVec(box[3]).mult(0.5),
		box[3], box[3].copy().addVec(box[0]).mult(0.5),
		box[0]);
	
	if( typeof outerleft !== 'boolean' )
	{	
		return CMap.findPathInPolygon(newcoor,
			[cornerIds[0] + (cornerIds[0] > index ? 10 : 0)
			,cornerIds[1] + (cornerIds[1] > index ? 10 : 0)]);
	}
	
	// First find path to bounding box
	var closestIndex;
	var closestDist = 10000;
	for(i=index+1;i<index+9;i++)
	{
		if( newcoor[i].distance(coor[cornerIds[0]]) < closestDist )
		{
			closestDist = newcoor[i].distance(coor[cornerIds[0]]);
			closestIndex = i;
		}
	}
	var infpath = CMap.findPathInPolygon(newcoor,
			[cornerIds[0] + (cornerIds[0] > index ? 10 : 0)
			,closestIndex]);
	var newcoor2 = coor.slice(0,cornerIds[0]+1);
	newcoor2 = newcoor2.concat(infpath);
	newcoor2 = newcoor2.concat(newcoor.slice(closestIndex,index+9));
	newcoor2 = newcoor2.concat(newcoor.slice(index+1,closestIndex+1));
	newcoor2 = newcoor2.concat(infpath.slice().reverse());
	newcoor2 = newcoor2.concat(coor.slice(cornerIds[0]));
	var newCornerIds = [ outerleft ? 
		cornerIds[0] + 2*infpath.length + 10 : cornerIds[0],
		cornerIds[1] < cornerIds[0] ? cornerIds[1] :
		cornerIds[1] + 2*infpath.length + 10 ];
	return CMap.findPathInPolygon(newcoor2,newCornerIds);
}

CMap.polygonAngleSum = function(coor){
	var angle = 0.0;
	var prevprevCoor = coor[coor.length-2];
	var prevCoor = coor[coor.length-1];
	coor.forEach(function(c){
		if( c == prevprevCoor )
		{
			angle += 2 * Math.PI;
		} else
		{
			angle += c.copy().subVec(prevCoor).anglePos(
				prevprevCoor.copy().subVec(prevCoor));
		}
		prevprevCoor = prevCoor;
		prevCoor = c;
	});
	return angle;
};
CMap.polygonExteriorAngle = function(coor){
	return coor.length * Math.PI - CMap.polygonAngleSum(coor);
}
CMap.polygonIsSimple = function(pol,outer){
	outer = defaultFor(outer,false);
	if( (pol.length < 3 && !outer) ||
		(pol.length < 2 && outer) )
	{
		return false;
	}
	var angle = CMap.polygonAngleSum(pol);
	if( outer )
	{
		if( Math.abs(angle-(pol.length+2)*Math.PI) > 0.1 )
			return false;
	}else
	{
		if( Math.abs(angle-(pol.length-2)*Math.PI) > 0.1 )
			return false;
	}
	if( pol.length == 3 )
	{
		return true;
	}
	
	var eventQueue = [];
	for(var i=0;i<pol.length;i++)
	{
		var segment = {p: pol[i], p2: pol[(i+1)%pol.length] };
		segment.left = (segment.p.x == segment.p2.x ? 
			segment.p.y <= segment.p2.y : segment.p.x <= segment.p2.x);
		eventQueue.push(segment);
		eventQueue.push({p:segment.p2,p2:segment.p,left:!segment.left});
	}
	eventQueue.sort(function(a,b){ return (a.p==b.p? 
		(a.p2==b.p2 ? (a.left ? -1 : 1 ) : 
		(a.p2.x==b.p2.x ? a.p2.y-b.p2.y : a.p2.x-b.p2.x ))
		 : (a.p.x==b.p.x? a.p.y - b.p.y : a.p.x-b.p.x)); });
	for(var i=0;i<eventQueue.length-1;i++)
	{
		if( eventQueue[i+1].p == eventQueue[i].p && 
			eventQueue[i+1].p2 == eventQueue[i].p2 )
		{
			eventQueue[i+1].double = true;
		}
	}
	eventQueue = eventQueue.filter(function(e){ return !("double" in e);});
	var sweepLine = [];
	return eventQueue.every(function(e){
		if( e.left )
		{
			// Find the first segment in sweepLine that is above e.p
			var position = 0;
			if( sweepLine.some(function(s,i){ 
					position=i; 
					if( s.p == e.p )
					{
						// same starting point: check slopes
						return (s.p2.y - s.p.y)*(e.p2.x-e.p.x) >= (e.p2.y - e.p.y)*(s.p2.x-s.p.x)
					}
					return (s.p2.y - s.p.y) * (e.p.x-s.p.x) > (e.p.y - s.p.y) * (s.p2.x - s.p.x);  
				}) ) {
				sweepLine.splice(position,0,e);
			} else
			{
				sweepLine.push(e);
				position = sweepLine.length-1;
			}
			if( position > 0 && CMap.segmentsIntersect([e.p,e.p2],[sweepLine[position-1].p,sweepLine[position-1].p2]) )
				return false;
			if( position < sweepLine.length-1 && CMap.segmentsIntersect([e.p,e.p2],
								[sweepLine[position+1].p,sweepLine[position+1].p2]) )
				return false;
		} else
		{
			var position = 0;
			sweepLine.some(function(s,i){ position=i; return s.p == e.p2 && s.p2 == e.p; });
			sweepLine.splice(position,1);
			if( position > 0 && position < sweepLine.length &&
				CMap.segmentsIntersect( [sweepLine[position].p,sweepLine[position].p2], 
										[sweepLine[position-1].p,sweepLine[position-1].p2] ) )
				return false;
		}
		return true;
	});
};
// Assuming point is in face, return the closest corner (if any)
// that contains the point in its angular region.
CMap.pointToCorner = function(face,point) {
	var result = {corner: null, distance: Number.MAX_VALUE};
	face.edges.forEach(function(edge){
		var tangent1 = CMap.getTangent(edge);
		var tangent2 = CMap.getTangent(edge.prev().reverse());
		if( edge.isReverse(edge.prev()) || 
			point.minus(edge.start().pos).isInBetween(tangent1,tangent2) )
		{
			var dist = point.distance(edge.start().pos);
			if( dist < result.distance )
			{
				result.distance = dist;
				result.corner = edge;
			}
		}
	});
	return result;
}

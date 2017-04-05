// *******************************************************
// The UCLA Shapes library - An attempt to generate the largest diversity of primitive 3D shapes using the smallest amount of code.   
// CS 174a Graphics Example Code (Javascript or C++ versions)

// Custom_Shapes.js - Defines a number of objects that inherit from class Shape.  All Shapes have certain arrays.  Each array manages either the Shape's 3D vertex 
// positions, vertex normal vectors, 2D texture coordinates, and any other per-vertex quantity.  All subclasses of Shape inherit all these arrays.  
// Upon instantiation, any Shape subclass populates these lists in their own way, and then automatically makes GL calls -- special kernel
// functions to copy each of the lists one-to-one into new buffers in the graphics card's memory.


// *********** TUTORIAL SHAPES ***********
//
// These stand alone; other code won't break if you change them.  Mimic these when making your own Shapes.  You'll have an easier time than managing GL vertex arrays yourself.
//  - Triangle   
//  - Square   
//  - Tetrahedron    
//  - Windmill
//  - Load shape from .obj file



// *********** TRIANGLE ***********
// First, the simplest possible Shape – one triangle.  It has 3 vertices, each having their own 3D position, normal vector, and texture-space coordinate.

Make_Shape_Subclass( "Triangle", Shape );
    Triangle.prototype.populate = function()
    {
       this.positions     .push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );   // Specify the 3 vertices -- the point cloud that our Triangle needs.
       this.normals       .push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) );   // ...
       this.texture_coords.push( vec2(0,0),   vec2(0,1),   vec2(1,0)   );   // ...
       this.indices       .push( 0, 1, 2 );                                 // Index into our vertices to connect them into a whole Triangle.
    };
    
    
// *********** SQUARE ***********
// A square, demonstrating shared vertices.  On any planar surface, the interior edges don't make any important seams.  In these cases there's no reason not 
// to re-use values of the common vertices between triangles.  This makes all the vertex arrays (position, normals, etc) smaller and more cache friendly.
  
Make_Shape_Subclass( "Square", Shape );
    Square.prototype.populate = function()
    {
       this.positions     .push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0), vec3(1,1,0) ); // Specify the 4 vertices -- the point cloud that our Square needs.
       this.normals       .push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) ); // ...
       this.texture_coords.push( vec2(0,0),   vec2(0,1),   vec2(1,0),   vec2(1,1)   ); // ...
       this.indices       .push( 0, 1, 2,     1, 3, 2 );                               // Two triangles this time, indexing into four distinct vertices.
    };

// *********** TETRAHEDRON *********** 
// A demo of flat vs smooth shading.  Also our first 3D, non-planar shape.

Make_Shape_Subclass( "Tetrahedron", Shape );
  Tetrahedron.prototype.populate = function( using_flat_shading )   // Takes a boolean argument 
  {  
    var a = 1/Math.sqrt(3);   
    
    if( !using_flat_shading )
    {
      // Method 1:  A tetrahedron with shared vertices.  Compact, performs better, but can't produce flat shading or discontinuous seams in textures.
        this.positions     .push( vec3(0,0,0),    vec3(0,1,0), vec3(1,0,0), vec3(0,0,1) );
        this.normals       .push( vec3(-a,-a,-a), vec3(0,1,0), vec3(1,0,0), vec3(0,0,1) );
        this.texture_coords.push( vec2(0,0),      vec2(0,1),   vec2(1,0),   vec2(1,1)   );
        this.indices.push( 0, 1, 2,   0, 1, 3,   0, 2, 3,    1, 2, 3 );          // Vertices are shared multiple times with this method.
    }   
    else
    {
      // Method 2:  A tetrahedron with four independent triangles.  
        this.positions.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.positions.push( vec3(0,0,0), vec3(0,1,0), vec3(0,0,1) );
        this.positions.push( vec3(0,0,0), vec3(1,0,0), vec3(0,0,1) );
        this.positions.push( vec3(0,0,1), vec3(0,1,0), vec3(1,0,0) );

        this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) );       // Method 2 is flat shaded, since each triangle has its own normal.
        this.normals.push( vec3(1,0,0), vec3(1,0,0), vec3(1,0,0) );
        this.normals.push( vec3(0,1,0), vec3(0,1,0), vec3(0,1,0) );
        this.normals.push( vec3(a,a,a), vec3(a,a,a), vec3(a,a,a) );
    
      // Each face in Method 2 also gets its own set of texture coords (half the image is mapped onto each face).  We couldn't do
      // this with shared vertices -- after all, it involves different results when approaching the same point from different directions.
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        this.texture_coords.push( vec3(0,0,0), vec3(0,1,0), vec3(1,0,0) );
        
        this.indices.push( 0, 1, 2,    3, 4, 5,    6, 7, 8,    9, 10, 11 );      // Notice all vertices are unique this time.
    }
  };    
  

// *********** WINDMILL *********** 
// As our shapes get more complicated, we begin using matrices and flow control (including loops) to generate nontrivial point clouds and connect them.

Make_Shape_Subclass( "Windmill", Shape );
    Windmill.prototype.populate = function( reserved_parameter, num_blades )
    {
        for( var i = 0; i < num_blades; i++ )     // A loop to automatically generate the triangles.
        {
            var spin = rotation( i * 360/num_blades, 0, 1, 0 );             // Rotate around a few degrees in XZ plane to place each new point.
            var newPoint = mult_vec( spin, vec4( 1, 0, 0, 1 ) );            // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
            this.positions.push( vec3( newPoint[0], 0, newPoint[2] ) );     // Store this XZ position.  This is point 1.
            this.positions.push( vec3( newPoint[0], 1, newPoint[2] ) );     // Store it again but with higher y coord:  This is point 2.
            this.positions.push( vec3( 0, 0, 0 ) );                         // All triangles touch this location.  This is point 3.
            
            var newNormal = mult_vec( spin, vec3( 0, 0, 1 ) );              // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful! 
            this.normals.push( vec3( newNormal ) );                         // Normal vectors are not points; their perpendicularity constraint gives them 
            this.normals.push( vec3( newNormal ) );                         // a mathematical quirk that when applying matrices you have to apply the 
            this.normals.push( vec3( newNormal ) );                         // transposed inverse of that matrix insFmyd.  But right now we've got a pure 
                                                                            // rotation matrix, where the inverse and transpose operations cancel out.
            this.texture_coords.push( vec2( 0, 0 ) );                       
            this.texture_coords.push( vec2( 0, 1 ) );                       // Repeat the same arbitrary texture coords for each fan blade.
            this.texture_coords.push( vec2( 1, 0 ) );                       
            this.indices.push ( 3 * i );     this.indices.push ( 3 * i + 1 );        this.indices.push ( 3 * i + 2 ); // Procedurally connect the new
        }                                                                                                             // vertices into triangles.
    };
    
Make_Shape_Subclass( "Fish", Shape );
  Fish.prototype.populate = function() {
    var points = [ vec3(1,-2,.5), vec3(1,2,.5), vec3(-1,0,.5), vec3(1,-2,-.5), vec3(1,2,-.5), vec3(-1,0,-.5) ];

    var tran1 = mult( scale(.5, .5, .5), translation(3, 0, 0) );
    var tran2 = mult( tran1, rotation(180, 0, 1, 0) ); // for body
    var tran3 = mult( scale(.5, .5, .5), translation(5, 0, 0) ); // for tail

    for( var i = 0; i < points.length; i++ ){ // head
      this.positions.push( points[i] );
    }
    for( var i = 0; i < points.length; i++ ){ // body
      var newPoint = mult_vec( tran2, vec4( points[i][0], points[i][1], points[i][2], 1 ) );
      this.positions.push( vec3( newPoint[0], newPoint[1], newPoint[2] ) );
    }
    for( var i = 0; i < points.length; i++ ){ // tail
      var newPoint = mult_vec( tran3, vec4( points[i][0], points[i][1], points[i][2], 1 ) );
      this.positions.push( vec3( newPoint[0], newPoint[1], newPoint[2] ) );
    }    
    
    this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,-1), vec3(0,0,-1), vec3(0,0,-1) ); // head
    this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,-1), vec3(0,0,-1), vec3(0,0,-1) ); // body
    this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,-1), vec3(0,0,-1), vec3(0,0,-1) ); // tail

    this.texture_coords.push( vec2(0,1), vec2(1,1), vec2(0,.5), // head
                              vec2(0,0), vec2(1,0), vec2(1,1), vec2(1,0), vec2(0,1), vec2(1,1), 
                              vec2(0,1), vec2(1,1), vec2(0,.5) );
    this.texture_coords.push( vec2(0,1), vec2(1,1), vec2(0,.5), // body
                              vec2(0,0), vec2(1,0), vec2(1,1), vec2(1,0), vec2(0,1), vec2(1,1), 
                              vec2(0,1), vec2(1,1), vec2(0,.5) );
    this.texture_coords.push( vec2(0,1), vec2(1,1), vec2(0,.5), // tail
                              vec2(0,0), vec2(1,0), vec2(1,1), vec2(1,0), vec2(0,1), vec2(1,1), 
                              vec2(0,1), vec2(1,1), vec2(0,.5) );    

    var indices_for_head = [ 0,1,2,  0,2,5, 0,3,5,  1,2,4, 2,4,5,  0,1,3, 1,3,4,  3,4,5 ];

    for( var i = 0; i < indices_for_head.length; i++ ){ // head
      this.indices.push( indices_for_head[i] );
    };
    for( var i = 0; i < indices_for_head.length; i++ ){ // body
      this.indices.push( indices_for_head[i]+6 );
    };
    for( var i = 0; i < indices_for_head.length; i++ ){ // tail
      this.indices.push( indices_for_head[i]+12 );
    };    
  }

Make_Shape_Subclass( "Shell", Shape );
  Shell.prototype.populate = function() {
    for( var i = 0; i < 8; i++ ){
      var spin = rotation( i*45, 0, 0, 1);
      var newPoint = mult_vec( spin, vec4(1, 0, 0, 1) );
      this.positions.push( vec3( newPoint[0], newPoint[1], newPoint[2] ) );  
      this.normals.push( vec3(0, 0, 1) );
      this.texture_coords.push( vec2( newPoint[0]/2 + 1, newPoint[2]/2 + 1 ) );
      if( i===0 || i===1 ) continue;
      this.indices.push(0); this.indices.push(i-1); this.indices.push(i);
    }

    for( var i = 0; i < 8; i++ ){
      var spin = rotation( i*45, 0, 0, 1);
      var newPoint = mult_vec( spin, vec4(1, 0, -.3, 1) );
      this.positions.push( vec3( newPoint[0] * 2, newPoint[1] * 2, newPoint[2] ) );  
      this.normals.push( vec3(0, 0, 1) );
      this.texture_coords.push( vec2( newPoint[0]/2 + 1, newPoint[2]/2 + 1 ) );
      if( i===7 ){
        this.indices.push(i); this.indices.push(0); this.indices.push(i+8);
        this.indices.push(0); this.indices.push(i+8); this.indices.push(8);
      }
      else{
        this.indices.push(i); this.indices.push(i+1); this.indices.push(i+8);
        this.indices.push(i+1); this.indices.push(i+8); this.indices.push(i+9);
      }
    }

    for( var i = 0; i < 8; i++ ){
      var spin = rotation( i*45, 0, 0, 1);
      var newPoint = mult_vec( spin, vec4(1, 0, -2, 1) );
      this.positions.push( vec3( newPoint[0] * 3, newPoint[1] * 3, newPoint[2] ) );  
      this.normals.push( vec3(0, 0, 1) );
      this.texture_coords.push( vec2( newPoint[0]/2 + 1, newPoint[2]/2 + 1 ) );
      if( i===7 ){
        this.indices.push(i+8); this.indices.push(8); this.indices.push(i+16);
        this.indices.push(8); this.indices.push(i+16); this.indices.push(16);
      }
      else{
        this.indices.push(i+8); this.indices.push(i+9); this.indices.push(i+16);
        this.indices.push(i+9); this.indices.push(i+16); this.indices.push(i+17);
      }
      if( i===0 || i===1 ) continue;
      this.indices.push(16); this.indices.push(i+15); this.indices.push(i+16); 
    }    
}

Make_Shape_Subclass( "T_body", Shape );
  T_body.prototype.populate = function() {
    for( var i = 0; i < 8; i++ ){
      var spin = rotation( i*45, 0, 0, 1);
      var newPoint = mult_vec( spin, vec4(1, 0, 0, 1) );
      this.positions.push( vec3( newPoint[0], newPoint[1], newPoint[2] ) );  
      this.normals.push( vec3(0, 0, 1) );
      this.texture_coords.push( vec2( newPoint[0]/2 + 1, newPoint[2]/2 + 1 ) );
      if( i===0 || i===1 ) continue;
      this.indices.push(0); this.indices.push(i-1); this.indices.push(i);
    }

    for( var i = 0; i < 8; i++ ){
      var spin = rotation( i*45, 0, 0, 1);
      var newPoint = mult_vec( spin, vec4(1, 0, -1.5, 1) );
      this.positions.push( vec3( newPoint[0] * 2, newPoint[1] * 2, newPoint[2] ) );  
      this.normals.push( vec3(0, 0, 1) );
      this.texture_coords.push( vec2( newPoint[0]/2 + 1, newPoint[2]/2 + 1 ) );
      if( i===7 ){
        this.indices.push(i); this.indices.push(0); this.indices.push(i+8);
        this.indices.push(0); this.indices.push(i+8); this.indices.push(8);
      }
      else{
        this.indices.push(i); this.indices.push(i+1); this.indices.push(i+8);
        this.indices.push(i+1); this.indices.push(i+8); this.indices.push(i+9);
      }
      if( i===0 || i===1 ) continue;
      this.indices.push(8); this.indices.push(i+7); this.indices.push(i+8);       
    }
  }

Make_Shape_Subclass( "T_hand", Shape );
  T_hand.prototype.populate = function() {
    this.positions.push( vec3(0, 0, 0), vec3(1, 0, 0), vec3(1.5, -3, 0), vec3(-.4, -.4, 0) );
    this.normals.push( vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1) );
    this.texture_coords.push( vec2(0, 1), vec2(1, 1), vec2(1, 0), vec2(0, 0) );
    this.indices.push( 0,1,2, 0,2,3 );

    this.positions.push( vec3(0, 0, -1), vec3(1, 0, -1), vec3(1.5, -3, -1), vec3(-.4, -.4, -1) );
    this.normals.push( vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1) );
    this.texture_coords.push( vec2(0, 1), vec2(1, 1), vec2(1, 0), vec2(0, 0) );
    this.indices.push( 4,5,6, 4,6,7 );
    this.indices.push( 0,1,4,  1,4,5,  0,3,4,  3,4,7,  1,2,5,  2,5,6,  2,3,6,  3,6,7 ); 
  }

Make_Shape_Subclass( "T_leg", Shape );
  T_leg.prototype.populate = function() {
    this.positions.push( vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, -2, 0), vec3(.5, -2, 0), vec3(-.5, -.5, 0) );
    this.normals.push( vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1) );
    this.texture_coords.push( vec2(0, 1), vec2(0, 0), vec2(1/3, 0), vec2(2/3, 0), vec2(1, 0) );
    this.indices.push( 0,1,2, 0,2,3, 0,3,4 ); 

    this.positions.push( vec3(0, 0, -1), vec3(1, 0, -1), vec3(2, -2, -1), vec3(.5, -2, -1), vec3(-.5, -.5, -1) );
    this.normals.push( vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1) );
    this.texture_coords.push( vec2(0, 1), vec2(0, 0), vec2(1/3, 0), vec2(2/3, 0), vec2(1, 0) );
    this.indices.push( 5,6,7, 5,7,8, 5,8,9 );
    this.indices.push( 0,1,5,  1,5,6,  1,2,6,  2,6,7,  2,3,7,  3,7,8,  3,4,8,  4,8,9,  0,4,5,  4,5,9 ); 
  }  

Make_Shape_Subclass( "T_head", Shape );
  T_head.prototype.populate = function() {
    this.positions.push( vec3(0, 0, 0), vec3(.5, .5, -1), vec3(.5, -.5, -1), vec3(-.5, .5, -1), vec3(-.5, -.5, -1) );
    this.normals.push( vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1) );
    this.texture_coords.push( vec2(.5, 1), vec2(0, 0), vec2(1, 0), vec2(0, 0), vec2(1, 0) );
    this.indices.push( 0,1,2, 0,2,4, 0,4,3, 0,3,1, 1,2,3, 2,3,4 );
  }

Make_Shape_Subclass( "Clam", Shape );
  Clam.prototype.populate = function() {
    this.positions.push( vec3(0, 0, 0) ); 
    this.normals.push( vec3(0, 1, 0) ); 
    this.texture_coords.push( vec2(1, 0) );

    for( var i = 3; i <= 21; i++ )
    {
      var spin = rotation( i*15, 0, 1, 0 );
      var newPoint = mult_vec( spin, vec4(0, 0, -1, 1) );
      this.positions.push( vec3( newPoint[0] * 1.5, 0, newPoint[2] + 2 ) );
      this.normals.push( vec3(0, 1, 0) );
      this.texture_coords.push( vec2( newPoint[0]/2 + 1, newPoint[2]/2 + 1 ) );
      if( i === 3 ) continue;
      this.indices.push(0); this.indices.push(i-3); this.indices.push(i-2);
    }
  };

Make_Shape_Subclass( "Leaf", Shape );
  Leaf.prototype.populate = function() {
    this.positions.push( vec3(0,0,0), vec3(2,1,0), vec3(4,0,0), vec3(1,-2,0) );
    this.normals.push( vec3(0,0,1), vec3(0,0,1), vec3(0,0,1), vec3(0,0,1) );
    this.texture_coords.push( vec2(0,0), vec2(2,1), vec2(4,0), vec2(1,-2) );
    this.indices.push( 0,1,2, 0,2,3 );
} 

Make_Shape_Subclass( "Rock", Shape );
  Rock.prototype.populate = function( reserved_parameter, num_edges ) {
    var a = Math.atan(2);
    var y = Math.cos(a);
    var x = Math.sin(a);
    var v = vec3(x, y, 0);

    this.positions.push( vec3(0, 0, 0), vec3(0, 1, 0), vec3(0, -1, 0) );
    this.normals.push( vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, -1, 0) );
    this.texture_coords.push( vec2(1, 0), vec2(1, 1), vec2(1, 1) );

    for( var i = 0; i < num_edges+1; i++ ) // top 
    {
        var spin = rotation( i*360/num_edges, 0, 1, 0 );             
        var newPoint = mult_vec( spin, vec4(1, 0, 0, 1) );             
        this.positions.push( vec3( newPoint[0]*1.5, 2, newPoint[2]*1.5 ) );
        var normal = mult_vec( spin, vec4(x, y, 0, 1) );
        this.normals.push( vec3( normal[0], normal[1], normal[2]) );
        this.texture_coords.push( vec2(i, 1) );
    }
    for( var i = 0; i < num_edges+1; i++ ) // body
    {
        var spin = rotation( i*360/num_edges, 0, 1, 0 );             
        var newPoint = mult_vec( spin, vec4(1, 0, 0, 1) );                 
        this.positions.push( vec3( newPoint[0], 0, newPoint[2] ) );
        this.normals.push( vec3( newPoint[0], 0, newPoint[2] ) );
        this.texture_coords.push( vec2(i, 0) );     
    }
    for( var i = 0; i < num_edges+1; i++ ) // bottom   
    {
        var spin = rotation( i*360/num_edges, 0, 1, 0 );             
        var newPoint = mult_vec( spin, vec4(1, 0, 0, 1) );                  
        this.positions.push( vec3( newPoint[0]*1.5, -2, newPoint[2]*1.5 ) );
        var normal = mult_vec( spin, vec4(x, -y, 0, 1) );
        this.normals.push( vec3( normal[0], normal[1], normal[2]) );
        this.texture_coords.push( vec2(i, 1) );  
    }

    var top_max_vertex = num_edges+3;
    for( var i = 3; i <= top_max_vertex; i++ ){ // connect top and middle
      // this.indices.push(0); this.indices.push(1); this.indices.push(i);
      // this.indices.push(0); this.indices.push(i); this.indices.push(i+num_edges+1);
      // this.indices.push(1); this.indices.push(i); this.indices.push(i-1);
      this.indices.push(i); this.indices.push(i-1); this.indices.push(i-1+num_edges+1);
      this.indices.push(i); this.indices.push(i+num_edges+1); this.indices.push(i-1+num_edges+1);
    }

    var bot_min_vertex = num_edges*2+5;
    var bot_max_vertex = num_edges*3+5;
    for( var i = bot_min_vertex; i <= bot_max_vertex; i++ ){ // connect middle and bottom
      if( i === bot_min_vertex ) continue;
      // this.indices.push(0); this.indices.push(2); this.indices.push(i);
      // this.indices.push(0); this.indices.push(i); this.indices.push(i-num_edges-1);    
      // this.indices.push(2); this.indices.push(i); this.indices.push(i-1);
      this.indices.push(i); this.indices.push(i-1); this.indices.push(i-1-num_edges-1);
      this.indices.push(i); this.indices.push(i-num_edges-1); this.indices.push(i-1-num_edges-1);
    }
  };        

    
// *********** SHAPE FROM FILE ***********
// Finally, here's a versatile standalone shape that imports all its arrays' data from an .obj file.  See webgl-obj-loader.js for the rest of the relevant code.

function Shape_From_File( filename, points_transform )		
	{
		Shape.call(this);
			
		this.draw = function( graphicsState, model_transform, material ) 	{
		 	if( this.ready ) Shape.prototype.draw.call(this, graphicsState, model_transform, material );		}	
		
		this.filename = filename;     this.points_transform = points_transform;

		this.webGLStart = function(meshes)
			{
				for( var j = 0; j < meshes.mesh.vertices.length/3; j++ )
				{
					this.positions.push( vec3( meshes.mesh.vertices[ 3*j ], meshes.mesh.vertices[ 3*j + 1 ], meshes.mesh.vertices[ 3*j + 2 ] ) );
          
					this.normals.push( vec3( meshes.mesh.vertexNormals[ 3*j ], meshes.mesh.vertexNormals[ 3*j + 1 ], meshes.mesh.vertexNormals[ 3*j + 2 ] ) );
					this.texture_coords.push( vec2( meshes.mesh.textures[ 2*j ],meshes.mesh.textures[ 2*j + 1 ]  ));
				}
				this.indices  = meshes.mesh.indices;	  
        
        for( var i = 0; i < this.positions.length; i++ )                         // Apply points_transform to all points added during this call
        { this.positions[i] = vec3( mult_vec( this.points_transform, vec4( this.positions[ i ], 1 ) ) );    
          this.normals[i]  = vec3( mult_vec( transpose( inverse( this.points_transform ) ), vec4( this.normals[ i ], 1 ) ) );     }
          
				this.init_buffers();
				this.ready = true;
			}                                                 // Begin downloading the mesh, and once it completes return control to our webGLStart function
		OBJ.downloadMeshes( { 'mesh' : filename }, (function(self) { return self.webGLStart.bind(self) }(this) ) );
	}
inherit( Shape_From_File, Shape );

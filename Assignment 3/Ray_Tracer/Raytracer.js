// CS 174a Project 3 Ray Tracer Skeleton

function Ball( )
{                                 // *** Notice these data members. Upon construction, a Ball first fills them in with arguments:
  var members = [ "position", "size", "color", "k_a", "k_d", "k_s", "n", "k_r", "k_refract", "refract_index" ];
  for( i in arguments )    this[ members[ i ] ] = arguments[ i ];
  this.construct();
}

Ball.prototype.construct = function()
{
  // TODO:  Give Ball any other data members that might be useful, assigning them according to this Ball's this.position and this.size members.

  this.model_transform = mult( translation( this.position[0], this.position[1], this.position[2] ), scale( this.size[0], this.size[1], this.size[2] ) );
  this.inverse_transform = inverse(this.model_transform);
}

Ball.prototype.intersect = function( ray, existing_intersection, minimum_dist )
{
  // TODO:  Given a ray, check if this Ball is in its path.  Recieves as an argument a record of the nearest intersection found 
  //        so far, updates it if needed and returns it.  Only counts intersections that are at least a given distance ahead along the ray.
  //        An interection object is assumed to store a Ball pointer, a t distance value along the ray, and a normal.
  
  // ray = S + tc, ray_inversed = S' + tc'
  var S_inversed = mult_vec( this.inverse_transform, ray.origin );
  var c_inversed = mult_vec( this.inverse_transform, ray.dir );
  S_inversed.pop();
  c_inversed.pop();


  // for quadratic eq
  var a = dot( c_inversed, c_inversed );
  var b = dot( S_inversed, c_inversed );
  var c = dot( S_inversed, S_inversed ) - 1;
  var delta = b * b - a * c;
  var t, t1, t2, inside = false;

  if( delta === 0 ){ // 1 intersection
    t = -b/a;
    if( t <= minimum_dist ) return existing_intersection;
  }
  else if( delta > 0 ){ // 2 intersection
    t1 = ( -b - Math.sqrt(delta) ) / a;
    t2 = ( -b + Math.sqrt(delta) ) / a;
    if( t1 > minimum_dist ) t = t1;
    else if( t2 > minimum_dist ){
      t = t2;
      inside = true;
    }
    else return existing_intersection;
  }
  else return existing_intersection; // no intersection


  // there is intersection
  if( t < existing_intersection.distance ) { // update if closer
    existing_intersection.ball = this;
    existing_intersection.distance = t;
    existing_intersection.inside = inside; 

    var intersection_point = add( ray.origin, scale_vec( t, ray.dir ) );
    existing_intersection.intersect_point = intersection_point; // also saves intersection point 

    // var normal = inside ? scale_vec(-1, add( S_inversed, scale_vec( t, c_inversed ) ) ) : add( S_inversed, scale_vec( t, c_inversed ) );
    var normal = inside ? negate( add( S_inversed, scale_vec( t, c_inversed ) ) ) : add( S_inversed, scale_vec( t, c_inversed ) );
    var tranposed_inverse = transpose( this.inverse_transform );
    existing_intersection.normal = normalize( mult_vec( tranposed_inverse, normal ).slice(0,3) ); // for transformed sphere
  }

  return existing_intersection;
}

var mult_3_coeffs = function( a, b ) { return [ a[0]*b[0], a[1]*b[1], a[2]*b[2] ]; };       // Convenient way to combine two color vectors

var background_functions = {                // These convert a ray into a color even when no balls were struck by the ray.
waves: function( ray, distance )
{
  return Color( .5 * Math.pow( Math.sin( 2 * ray.dir[0] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[0] + Math.sin( 10 * ray.dir[1] ) + Math.sin( 10 * ray.dir[2] ) ) ),
                .5 * Math.pow( Math.sin( 2 * ray.dir[1] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[1] + Math.sin( 10 * ray.dir[0] ) + Math.sin( 10 * ray.dir[2] ) ) ),
                .5 * Math.pow( Math.sin( 2 * ray.dir[2] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[2] + Math.sin( 10 * ray.dir[1] ) + Math.sin( 10 * ray.dir[0] ) ) ), 1 );
},
lasers: function( ray, distance ) 
{
  var u = Math.acos( ray.dir[0] ), v = Math.atan2( ray.dir[1], ray.dir[2] );
  return Color( 1 + .5 * Math.cos( Math.floor( 20 * u ) ), 1 + .5 * Math.cos( Math.floor( 20 * v ) ), 1 + .5 * Math.cos( Math.floor( 8 * u ) ), 1 );
},
mixture:       function( ray, distance ) { return mult_3_coeffs( background_functions["waves"]( ray, distance ), background_functions["lasers"]( ray, distance ) ).concat(1); },
ray_direction: function( ray, distance ) { return Color( Math.abs( ray.dir[ 0 ] ), Math.abs( ray.dir[ 1 ] ), Math.abs( ray.dir[ 2 ] ), 1 );  },
color:         function( ray, distance ) { return background_color;  }
};
var curr_background_function = "color";
var background_color = vec4( 0, 0, 0, 1 );

// *******************************************************
// Raytracer class - gets registered to the window by the Animation object that owns it
function Raytracer( parent )  
{
  var defaults = { width: 32, height: 32, near: 1, left: -1, right: 1, bottom: -1, top: 1, scanline: 0, visible: true, anim: parent, ambient: vec3( .1, .1, .1 ) };
  for( i in defaults )  this[ i ] = defaults[ i ];
  
  this.m_square = new N_Polygon( 4 );                   // For texturing with and showing the ray traced result
  this.m_sphere = new Subdivision_Sphere( 4, true );    // For drawing with ray tracing turned off
  
  this.balls = [];    // Array for all the balls
    
  initTexture( "procedural", true, true );      // Our texture for drawing the ray trace    
  textures["procedural"].image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"   // Blank gif file
  
  this.scratchpad = document.createElement('canvas');   // A hidden canvas for assembling the texture
  this.scratchpad.width  = this.width;
  this.scratchpad.height = this.height;
  
  this.scratchpad_context = this.scratchpad.getContext('2d');
  this.imageData          = new ImageData( this.width, this.height );     // Will hold ray traced pixels waiting to be stored in the texture
  
  this.make_menu();
}

Raytracer.prototype.toggle_visible = function() { this.visible = !this.visible; document.getElementById("progress").style = "display:inline-block;" };

Raytracer.prototype.make_menu = function()      // The buttons
{
  document.getElementById( "raytracer_menu" ).innerHTML = "<span style='white-space: nowrap'><button id='toggle_raytracing' class='dropbtn' style='background-color: #AF4C50'>Toggle Ray Tracing</button> \
                                                           <button onclick='document.getElementById(\"myDropdown2\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #8A8A4C'>Select Background Effect</button><div id='myDropdown2' class='dropdown-content'>  </div>\
                                                           <button onclick='document.getElementById(\"myDropdown\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #4C50AF'>Select Test Case</button><div id='myDropdown' class='dropdown-content'>  </div> \
                                                           <button id='submit_scene' class='dropbtn'>Submit Scene Textbox</button> \
                                                           <div id='progress' style = 'display:none;' ></div></span>";
  for( i in test_cases )
  {
    var a = document.createElement( "a" );
    a.addEventListener("click", ( function( i, self ) { return function() { load_case( i ); self.parseFile(); }; } )( i, this ), false);
    a.innerHTML = i;
    document.getElementById( "myDropdown" ).appendChild( a );
  }
  for( j in background_functions )
  {
    var a = document.createElement( "a" );
    a.addEventListener("click", ( function( j ) { return function() { curr_background_function = j; } } )( j ), false);
    a.innerHTML = j;
    document.getElementById( "myDropdown2" ).appendChild( a );
  }
  
  document.getElementById( "input_scene" ).addEventListener( "keydown", function(event) { event.cancelBubble = true; }, false );
  
  window.addEventListener( "click", function(event) {  if (!event.target.matches('.dropbtn')) {    
  document.getElementById( "myDropdown"  ).classList.remove("show");
  document.getElementById( "myDropdown2" ).classList.remove("show"); } }, false );

  document.getElementById( "toggle_raytracing" ).addEventListener("click", this.toggle_visible.bind( this ), false);
  document.getElementById( "submit_scene" ).addEventListener("click", this.parseFile.bind( this ), false);
}

Raytracer.prototype.getDir = function( ix, iy ) {
  
  // TODO:  Maps an (x,y) pixel to a corresponding xyz vector that reaches the near plane.  This function, once finished,
  //        will help cause everything under the "background functions" menu to start working. 
  
  var a = ix / this.width;
  var b = iy / this.height;
  var x = a * this.right + (1-a) * this.left;
  var y = b * this.top + (1-b) * this.bottom;

  return vec4( x, y, -this.near, 0 );  
}
  
Raytracer.prototype.trace = function( ray, color_remaining, shadow_test )
{
  // TODO:  Given a ray, return the color in that ray's path.  Could be originating from the camera itself or from a secondary reflection 
  //        or refraction off a ball.  Call Ball.prototype.intersect on each ball to determine the nearest ball struck, if any, and perform
  //        vector math (namely the Phong reflection formula) using the resulting intersection record to figure out the influence of light on 
  //        that spot.  
  //
  //        Arguments include some indicator of recursion level so you can cut it off after a few recursions.  Or, optionally,
  //        instead just store color_remaining, the pixel's remaining potential to be lit up more... proceeding only if that's still significant.  
  //        If a light source for shadow testing is provided as the optional final argument, this function's objective simplifies to just 
  //        checking the path directly to a light source for obstructions.

  if( length( color_remaining ) < .3 )    return Color( 0, 0, 0, 1 );  // Is there any remaining potential for brightening this pixel even more?

  var min_dist = (ray.recursive) ? 0.0001 : 1;
  var closest_intersection = { distance: Number.POSITIVE_INFINITY }    // An empty intersection object

  // intersect this ray with balls and update closet_intersection
  for( var i = 0; i < this.balls.length; i++ )
    closest_intersection = this.balls[i].intersect( ray, closest_intersection, min_dist );

  // shadow test
  if( shadow_test ){
    if( closest_intersection.ball && !closest_intersection.inside ) return true; // in shadow
    else return false; // not in shadow
  }

  if( !closest_intersection.ball )
    return mult_3_coeffs( this.ambient, background_functions[ curr_background_function ] ( ray ) ).concat(1);  


  // Phong Illumination Model
  var color_local = vec3();
  var color_ambient = scale_vec( closest_intersection.ball.k_a, closest_intersection.ball.color );
  var color_diffuse = vec3();
  var color_specular = vec3();

  for( var j = 0; j < this.anim.graphicsState.lights.length; j++ ){
    var light_ray = { origin: closest_intersection.intersect_point, dir: subtract( this.anim.graphicsState.lights[j].position, closest_intersection.intersect_point ), recursive: true };
    if( this.trace( light_ray, color_remaining, true ) ) continue; // shadow test for each light source

    var l = normalize( light_ray.dir.slice(0,3) );
    var v = normalize( negate(ray.dir).slice(0,3) );
    var product = dot( closest_intersection.normal, l );
    // r = 2n(n.l) - l
    var r = normalize( subtract( scale_vec( 2 * product, closest_intersection.normal ), l ) );
    color_diffuse = add( color_diffuse, mult_3_coeffs( this.anim.graphicsState.lights[j].color.slice(0, 3), scale_vec( closest_intersection.ball.k_d * Math.max( product, 0 ), closest_intersection.ball.color ) ) );
    color_specular = add( color_specular, scale_vec( closest_intersection.ball.k_s * Math.pow( Math.max( dot(r, v), 0 ), closest_intersection.ball.n ), this.anim.graphicsState.lights[j].color.slice(0, 3) ) );

  }
  color_local = add( color_ambient, add( color_diffuse, color_specular ) );


  // reflection
  var normal_vec4 = vec4( closest_intersection.normal[0], closest_intersection.normal[1], closest_intersection.normal[2], 0 ); 
  var ray_reflect_dir = add( scale_vec( -2 * dot( normal_vec4, ray.dir ), normal_vec4 ), ray.dir );
  var ray_reflect = { origin: closest_intersection.intersect_point, dir: ray_reflect_dir, recursive: true };
  var color_remaining_reflect = scale_vec( closest_intersection.ball.k_r, mult_3_coeffs( color_remaining, subtract( vec3( 1, 1, 1 ), color_local ) ) );
  var color_reflect = this.trace( ray_reflect, color_remaining_reflect );


  // refraction
  var r = (closest_intersection.inside) ? 1/closest_intersection.ball.refract_index : closest_intersection.ball.refract_index;
  var l = normalize( negate(ray.dir) );
  var c = -dot( normal_vec4, l );
  var ray_refract_dir = add( scale_vec( r, l ), scale_vec( r*c - Math.sqrt( 1 - r*r * ( 1 - c*c ) ), normal_vec4 ) );
  var ray_refract = { origin: closest_intersection.intersect_point, dir: ray_refract_dir, recursive: true };
  var color_remaining_refract = scale_vec( closest_intersection.ball.k_refract, mult_3_coeffs( color_remaining, subtract( vec3( 1, 1, 1 ), color_local ) ) );
  var color_refract = this.trace( ray_refract, color_remaining_refract );


  var reflect_and_refract = add( scale_vec( closest_intersection.ball.k_r, color_reflect.slice(0, 3) ), scale_vec( closest_intersection.ball.k_refract, color_refract.slice(0, 3) ) );
  var pixel_color = add( color_local, mult_3_coeffs( subtract( vec3(1, 1, 1) ,color_local ), reflect_and_refract ) );
  return pixel_color.concat(1);
   
}

Raytracer.prototype.parseLine = function( tokens )            // Load the text lines into variables
{
  switch( tokens[0] )
    {
        case "NEAR":    this.near   = tokens[1];  break;
        case "LEFT":    this.left   = tokens[1];  break;
        case "RIGHT":   this.right  = tokens[1];  break;
        case "BOTTOM":  this.bottom = tokens[1];  break;
        case "TOP":     this.top    = tokens[1];  break;
        case "RES":     this.width  = tokens[1];  
                        this.height = tokens[2]; 
                        this.scratchpad.width  = this.width;
                        this.scratchpad.height = this.height; 
                        break;
        case "SPHERE":
          this.balls.push( new Ball( vec3( tokens[1], tokens[2], tokens[3] ), vec3( tokens[4], tokens[5], tokens[6] ), vec3( tokens[7], tokens[8], tokens[9] ), 
                             tokens[10], tokens[11], tokens[12], tokens[13], tokens[14], tokens[15], tokens[16] ) );
          break;
        case "LIGHT":
          this.anim.graphicsState.lights.push( new Light( vec4( tokens[1], tokens[2], tokens[3], 1 ), Color( tokens[4], tokens[5], tokens[6], 1 ), 100000 ) );
          break;
        case "BACK":     background_color = Color( tokens[1], tokens[2], tokens[3], 1 );  gl.clearColor.apply( gl, background_color ); break;
        case "AMBIENT":
          this.ambient = vec3( tokens[1], tokens[2], tokens[3] );          
    }
}

Raytracer.prototype.parseFile = function()        // Move through the text lines
{
  this.balls = [];   this.anim.graphicsState.lights = [];
  this.scanline = 0; this.scanlines_per_frame = 1;                            // Begin at bottom scanline, forget the last image's speedup factor
  document.getElementById("progress").style = "display:inline-block;";        // Re-show progress bar
  this.anim.graphicsState.camera_transform = mat4();                          // Reset camera
  var input_lines = document.getElementById( "input_scene" ).value.split("\n");
  for( var i = 0; i < input_lines.length; i++ ) this.parseLine( input_lines[i].split(/\s+/) );
}

Raytracer.prototype.setColor = function( ix, iy, color )        // Sends a color to one pixel value of our final result
{
  var index = iy * this.width + ix;
  this.imageData.data[ 4 * index     ] = 255.9 * color[0];    
  this.imageData.data[ 4 * index + 1 ] = 255.9 * color[1];    
  this.imageData.data[ 4 * index + 2 ] = 255.9 * color[2];    
  this.imageData.data[ 4 * index + 3 ] = 255;  
}

Raytracer.prototype.display = function(time)
{
  var desired_milliseconds_per_frame = 100;
  if( ! this.prev_time ) this.prev_time = 0;
  if( ! this.scanlines_per_frame ) this.scanlines_per_frame = 1;
  this.milliseconds_per_scanline = Math.max( ( time - this.prev_time ) / this.scanlines_per_frame, 1 );
  this.prev_time = time;
  this.scanlines_per_frame = desired_milliseconds_per_frame / this.milliseconds_per_scanline + 1;
  
  if( !this.visible )  {                         // Raster mode, to draw the same shapes out of triangles when you don't want to trace rays
    for( i in this.balls )
        this.m_sphere.draw( this.anim.graphicsState, this.balls[i].model_transform, new Material( this.balls[i].color.concat( 1 ), 
                                                                              this.balls[i].k_a, this.balls[i].k_d, this.balls[i].k_s, this.balls[i].n ) );
    this.scanline = 0;    document.getElementById("progress").style = "display:none";     return; }; 
  if( !textures["procedural"] || ! textures["procedural"].loaded ) return;      // Don't display until we've got our first procedural image
  
  this.scratchpad_context.drawImage(textures["procedural"].image, 0, 0 );
  this.imageData = this.scratchpad_context.getImageData(0, 0, this.width, this.height );    // Send the newest pixels over to the texture
  var camera_inv = inverse( this.anim.graphicsState.camera_transform );
   
  for( var i = 0; i < this.scanlines_per_frame; i++ )     // Update as many scanlines on the picture at once as we can, based on previous frame's speed
  {
    var y = this.scanline++;
    if( y >= this.height ) { this.scanline = 0; document.getElementById("progress").style = "display:none" };
    document.getElementById("progress").innerHTML = "Rendering ( " + 100 * y / this.height + "% )..."; 
    for ( var x = 0; x < this.width; x++ )
    {
      var ray = { origin: mult_vec( camera_inv, vec4( 0, 0, 0, 1 ) ), dir: mult_vec( camera_inv, this.getDir( x, y ) ) };   // Apply camera
      this.setColor( x, y, this.trace( ray, vec3( 1, 1, 1 ) ) );                                    // ******** Trace a single ray *********
    }
  }
  
  this.scratchpad_context.putImageData( this.imageData, 0, 0);                    // Draw the image on the hidden canvas
  textures["procedural"].image.src = this.scratchpad.toDataURL("image/png");      // Convert the canvas back into an image and send to a texture
  
  this.m_square.draw( new GraphicsState( mat4(), mat4(), 0 ), mat4(), new Material( Color( 0, 0, 0, 1 ), 1,  0, 0, 1, "procedural" ) );

  if( !this.m_text  ) { this.m_text  = new Text_Line( 45 ); this.m_text .set_string("Open some test cases with the blue button."); }
  if( !this.m_text2 ) { this.m_text2 = new Text_Line( 45 ); this.m_text2.set_string("Click and drag to steer."); }
  
  var model_transform = rotation( -90, vec3( 0, 1, 0 ) );                           
      model_transform = mult( model_transform, translation( .3, .9, .9 ) );
      model_transform = mult( model_transform, scale( 1, .075, .05) );
  
  this.m_text .draw( new GraphicsState( mat4(), mat4(), 0 ), model_transform, true, vec4(0,0,0, 1 - time/10000 ) );         
      model_transform = mult( model_transform, translation( 0, -1, 0 ) );
  this.m_text2.draw( new GraphicsState( mat4(), mat4(), 0 ), model_transform, true, vec4(0,0,0, 1 - time/10000 ) );   
}

Raytracer.prototype.init_keys = function()   {  shortcut.add( "SHIFT+r", this.toggle_visible.bind( this ) );  }

Raytracer.prototype.update_strings = function( debug_screen_object )    // Strings that this displayable object (Raytracer) contributes to the UI:
  { }
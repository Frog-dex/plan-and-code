// SAMPLE FLOOR PLAN — an observatory study room (single source of truth for object placement).
// Both your three.js scene and plan.html (the top-down architect editor) read this file.
// Units = the scene's internal units.  Top-down view: X = left↔right, Z = depth.
//   back wall = minZ (negative) is at the TOP of the plan; the camera/front is at +Z (bottom).
// The .glb model files referenced below are NOT bundled — this is sample data; swap in your own.
export const ROOM = {
  minX:-820, maxX:820,        // side walls
  minZ:-720, maxZ:520,        // back wall (-720) .. front edge (520)
  floorY:-1790, ceilY:-1430,  // vertical extents
  camX:0, camZ:360, camY:-1604, camLookZ:-380   // where the viewer ends up + gaze
};

// Each item:
//   on   : mount plane — 'floor' (on the floor) · 'table' (on the desk's measured top) · 'ceiling' (hangs from the ceiling)
//   x,z  : plan position (units)          rot : yaw in degrees
//   h    : target height (units)          foot: [w,d] footprint — used by the plan drawing only
//   spin : true → the item swivels in 3D
//   hero : true → marks the hero object (drawn red-orange in the plan)
export const ITEMS = [
  { id:'desk',        model:'desk.glb',        on:'floor', x:0,    z:-430, rot:0,   h:150, foot:[320,150] },
  { id:'monitor',     model:'terminal.glb',    on:'table',  x:-20,  z:-455, rot:180, h:120, foot:[95,75],  spin:true },
  { id:'clock',       model:'clock.glb',       on:'table',  x:-215, z:-425, rot:20,  h:72,  foot:[55,42] },
  { id:'lamp',        model:'lamp.glb',        on:'table',  x:155,  z:-410, rot:0,   h:105, foot:[42,42] },
  { id:'books',       model:'books.glb',       on:'table',  x:215,  z:-430, rot:-15, h:58,  foot:[62,46] },
  { id:'signalscope', model:'signalscope.glb', on:'table',  x:90,   z:-400, rot:35,  h:66,  foot:[46,46] },
  { id:'telescope',   model:'telescope.glb',   on:'floor', x:-440, z:-330, rot:30,  h:185, foot:[130,130] },
  { id:'globe',       model:'globe.glb',       on:'floor', x:430,  z:-300, rot:0,   h:150, foot:[95,95] },
  { id:'lizard',      model:'lizard.glb',      on:'floor', x:330,  z:-120, rot:180, h:230, foot:[95,80],  hero:true }
];

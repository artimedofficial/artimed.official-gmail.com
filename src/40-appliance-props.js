/* ==========================================================================
   40 · APPLIANCE PROPS — chest / commercial freezers and the generator.
   ========================================================================== */

Object.assign(PROPS, {
  'prop.chest_freezer': (o) => {
    const pb = new PB(o.seed);
    pb.box(1.3, 0.85, 0.75, Mat.color('#eef1f2', 0.35, 0.15), 0, 0, 0, 0.04);
    pb.box(1.32, 0.06, 0.77, Mat.color('#dfe4e6', 0.3, 0.2), 0, 0.85, 0, 0.02);
    pb.box(0.3, 0.04, 0.04, Mat.color('#9aa4ad', 0.3, 0.6), 0, 0.78, 0.39);
    pb.box(0.12, 0.05, 0.01, Mat.emissive('#3aff8a', 0.6), 0.45, 0.6, 0.376);
    return pb.build();
  },
  'prop.large_freezer': (o) => {
    const pb = new PB(o.seed);
    pb.box(2.0, 0.9, 0.85, Mat.color('#c9cdd1', 0.35, 0.4), 0, 0, 0, 0.04);
    pb.box(0.98, 0.05, 0.83, Mat.color('#cfe4ec', 0.05, 0, { transparent: true, opacity: 0.35, depthWrite: false }), -0.5, 0.9, 0);
    pb.box(0.98, 0.05, 0.83, Mat.color('#cfe4ec', 0.05, 0, { transparent: true, opacity: 0.35, depthWrite: false }), 0.5, 0.9, 0);
    pb.box(2.0, 0.12, 0.85, Mat.color('#1f3f6a', 0.5), 0, 0, 0);
    pb.box(0.16, 0.06, 0.01, Mat.emissive('#3aff8a', 0.6), 0.75, 0.7, 0.426);
    return pb.build();
  },
  'prop.generator': (o) => {
    const pb = new PB(o.seed);
    const frame = Mat.color('#2b2b2b', 0.5, 0.6);
    for (const x of [-0.33, 0.33]) for (const z of [-0.25, 0.25]) pb.box(0.03, 0.55, 0.03, frame, x, 0, z);
    pb.box(0.6, 0.32, 0.42, Mat.color('#e07a2a', 0.45), 0, 0.12, 0, 0.04);
    pb.box(0.42, 0.14, 0.3, Mat.color('#c4202a', 0.4), -0.05, 0.44, 0, 0.05);
    pb.cyl(0.07, 0.07, 0.12, Mat.color('#5f656b', 0.4, 0.7), 0.25, 0.3, 0.18, 10, [Math.PI / 2, 0, 0]);
    pb.box(0.12, 0.08, 0.02, Mat.color('#1a1a1a', 0.4), -0.2, 0.25, 0.22);
    return pb.build();
  },
});
for (const id of ['prop.chest_freezer', 'prop.large_freezer', 'prop.generator']) AssetRegistry.register(id, PROPS[id]);

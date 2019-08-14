import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

function build() {
  return {
    input: 'src/main.js',
    output: {
      file: 'build/RayTracingRenderer.js',
      format: 'umd',
      globals: {
        three: 'THREE'
      },
      name: 'RayTracingRenderer'
    },
    plugins: [
      resolve()
    ],
    external: [
      'three',
    ]
  };
}

function buildEs5() {
  const b = build();
  b.output.file = 'build/RayTracingRenderer.es5.js';
  b.plugins.push(
    babel({
      exclude: 'node_modules/**',
      extensions: ['.js', '.glsl', '.frag', '.vert']
    })
  );
  return b;
}

const bundle = [
  build()
];

if (!process.env.DEV) {
  bundle.push(
    buildEs5()
  );
}

export default bundle;
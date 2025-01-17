import { BufferGeometry, Matrix4, Sphere, Ray, Vector3, LineSegments, BufferAttribute, ShaderChunk, ShaderMaterial, UniformsLib, Color, Vector2 } from 'three';

var inverseMatrix = new Matrix4();
var ray: Ray = new Ray();
var sphere = new Sphere();

export class LineMesh {
    [x: string]: any;
    constructor() {
        this.positions = [];

        this.previous = [];
        this.next = [];
        this.side = [];
        this.width = [];
        this.indices_array = [];
        this.uvs = [];
        this.counters = [];
        this.geometry = new BufferGeometry();

        this.widthCallback = null;

        // Used to raycast
        this.matrixWorld = new Matrix4();
    }

    setMatrixWorld(matrixWorld: Matrix4) {
        this.matrixWorld = matrixWorld;
    }


    setGeometry(g: BufferGeometry, c?: any) {

        this.widthCallback = c;

        this.positions = [];
        this.counters = [];
        // g.computeBoundingBox();
        // g.computeBoundingSphere();

        // set the normals
        // g.computeVertexNormals();
        if (g instanceof BufferGeometry) {
            var pos = g.getAttribute("position").array;
            for (var j = 0; j < pos.length; j++) {
                var v = pos[j];
                var c: any = j / pos.length;
                this.positions.push(v);
            }
        }

        if (g instanceof BufferGeometry) {
            // read attribute positions ?
        }

        if (g instanceof Float32Array || g instanceof Array) {
            for (var j = 0; j < g.length; j += 3) {
                var c: any = j / g.length;
                this.positions.push(g[j], g[j + 1], g[j + 2]);
                this.positions.push(g[j], g[j + 1], g[j + 2]);
                this.counters.push(c);
                this.counters.push(c);
            }
        }

        this.process();

    }

    raycast(raycaster: any, intersects: any) {

        var precision = raycaster.linePrecision;
        var precisionSq = precision * precision;

        var geometry = this.geometry;

        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

        // Checking boundingSphere distance to ray

        sphere.copy(geometry.boundingSphere);
        sphere.applyMatrix4(this.matrixWorld);

        if (raycaster.ray.intersectSphere(sphere) === false) {

            return;

        }

        inverseMatrix.getInverse(this.matrixWorld);
        ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);

        var vStart = new Vector3();
        var vEnd = new Vector3();
        var interSegment = new Vector3();
        var interRay = new Vector3();
        var step = this instanceof LineSegments ? 2 : 1;

        if (geometry instanceof BufferGeometry) {

            var index = geometry.index;
            var attributes = geometry.attributes;

            if (index !== null) {

                var indices = index.array;
                var positions = attributes.position.array;

                for (var i = 0, l = indices.length - 1; i < l; i += step) {

                    var a = indices[i];
                    var b = indices[i + 1];

                    vStart.fromArray(positions, a * 3);
                    vEnd.fromArray(positions, b * 3);

                    var distSq = ray.distanceSqToSegment(vStart, vEnd, interRay, interSegment);

                    if (distSq > precisionSq) continue;

                    interRay.applyMatrix4(this.matrixWorld); //Move back to world space for distance calculation

                    var distance = raycaster.ray.origin.distanceTo(interRay);

                    if (distance < raycaster.near || distance > raycaster.far) continue;

                    intersects.push({

                        distance: distance,
                        // What do we want? intersection point on the ray or on the segment??
                        // point: raycaster.ray.at( distance ),
                        point: interSegment.clone().applyMatrix4(this.matrixWorld),
                        index: i,
                        face: null,
                        faceIndex: null,
                        object: this

                    });

                }

            } else {

                var positions = attributes.position.array;

                for (var i = 0, l = positions.length / 3 - 1; i < l; i += step) {

                    vStart.fromArray(positions, 3 * i);
                    vEnd.fromArray(positions, 3 * i + 3);

                    var distSq = ray.distanceSqToSegment(vStart, vEnd, interRay, interSegment);

                    if (distSq > precisionSq) continue;

                    interRay.applyMatrix4(this.matrixWorld); //Move back to world space for distance calculation

                    var distance = raycaster.ray.origin.distanceTo(interRay);

                    if (distance < raycaster.near || distance > raycaster.far) continue;

                    intersects.push({

                        distance: distance,
                        // What do we want? intersection point on the ray or on the segment??
                        // point: raycaster.ray.at( distance ),
                        point: interSegment.clone().applyMatrix4(this.matrixWorld),
                        index: i,
                        face: null,
                        faceIndex: null,
                        object: this

                    });

                }

            }

        }

    };



    compareV3(a: any, b: any) {

        var aa = a * 6;
        var ab = b * 6;
        return (this.positions[aa] === this.positions[ab]) && (this.positions[aa + 1] === this.positions[ab + 1]) && (this.positions[aa + 2] === this.positions[ab + 2]);

    }

    copyV3(a: any) {

        var aa = a * 6;
        return [this.positions[aa], this.positions[aa + 1], this.positions[aa + 2]];

    }

    process() {

        var l = this.positions.length / 6;

        this.previous = [];
        this.next = [];
        this.side = [];
        this.width = [];
        this.indices_array = [];
        this.uvs = [];

        for (var j = 0; j < l; j++) {
            this.side.push(1);
            this.side.push(-1);
        }

        var w;
        for (var j = 0; j < l; j++) {
            if (this.widthCallback) w = this.widthCallback(j / (l - 1));
            else w = 1;
            this.width.push(w);
            this.width.push(w);
        }

        for (var j = 0; j < l; j++) {
            this.uvs.push(j / (l - 1), 0);
            this.uvs.push(j / (l - 1), 1);
        }

        var v;

        if (this.compareV3(0, l - 1)) {
            v = this.copyV3(l - 2);
        } else {
            v = this.copyV3(0);
        }
        this.previous.push(v[0], v[1], v[2]);
        this.previous.push(v[0], v[1], v[2]);
        for (var j = 0; j < l - 1; j++) {
            v = this.copyV3(j);
            this.previous.push(v[0], v[1], v[2]);
            this.previous.push(v[0], v[1], v[2]);
        }

        for (var j = 1; j < l; j++) {
            v = this.copyV3(j);
            this.next.push(v[0], v[1], v[2]);
            this.next.push(v[0], v[1], v[2]);
        }

        if (this.compareV3(l - 1, 0)) {
            v = this.copyV3(1);
        } else {
            v = this.copyV3(l - 1);
        }
        this.next.push(v[0], v[1], v[2]);
        this.next.push(v[0], v[1], v[2]);

        for (var j = 0; j < l - 1; j++) {
            var n = j * 2;
            this.indices_array.push(n, n + 1, n + 2);
            this.indices_array.push(n + 2, n + 1, n + 3);
        }

        if (!this.attributes) {
            this.attributes = {
                position: new BufferAttribute(new Float32Array(this.positions), 3),
                previous: new BufferAttribute(new Float32Array(this.previous), 3),
                next: new BufferAttribute(new Float32Array(this.next), 3),
                side: new BufferAttribute(new Float32Array(this.side), 1),
                width: new BufferAttribute(new Float32Array(this.width), 1),
                uv: new BufferAttribute(new Float32Array(this.uvs), 2),
                index: new BufferAttribute(new Uint16Array(this.indices_array), 1),
                counters: new BufferAttribute(new Float32Array(this.counters), 1)
            }
        } else {
            this.attributes.position.copyArray(new Float32Array(this.positions));
            this.attributes.position.needsUpdate = true;
            this.attributes.previous.copyArray(new Float32Array(this.previous));
            this.attributes.previous.needsUpdate = true;
            this.attributes.next.copyArray(new Float32Array(this.next));
            this.attributes.next.needsUpdate = true;
            this.attributes.side.copyArray(new Float32Array(this.side));
            this.attributes.side.needsUpdate = true;
            this.attributes.width.copyArray(new Float32Array(this.width));
            this.attributes.width.needsUpdate = true;
            this.attributes.uv.copyArray(new Float32Array(this.uvs));
            this.attributes.uv.needsUpdate = true;
            this.attributes.index.copyArray(new Uint16Array(this.indices_array));
            this.attributes.index.needsUpdate = true;
        }

        this.geometry.addAttribute('position', this.attributes.position);
        this.geometry.addAttribute('previous', this.attributes.previous);
        this.geometry.addAttribute('next', this.attributes.next);
        this.geometry.addAttribute('side', this.attributes.side);
        this.geometry.addAttribute('width', this.attributes.width);
        this.geometry.addAttribute('uv', this.attributes.uv);
        this.geometry.addAttribute('counters', this.attributes.counters);

        this.geometry.setIndex(this.attributes.index);

    }

    advance(position: any) {

        var positions = this.attributes.position.array;
        var previous = this.attributes.previous.array;
        var next = this.attributes.next.array;
        var l = positions.length;

        // PREVIOUS
        memcpy(positions, 0, previous, 0, l);

        // POSITIONS
        memcpy(positions, 6, positions, 0, l - 6);

        positions[l - 6] = position.x;
        positions[l - 5] = position.y;
        positions[l - 4] = position.z;
        positions[l - 3] = position.x;
        positions[l - 2] = position.y;
        positions[l - 1] = position.z;

        // NEXT
        memcpy(positions, 6, next, 0, l - 6);

        next[l - 6] = position.x;
        next[l - 5] = position.y;
        next[l - 4] = position.z;
        next[l - 3] = position.x;
        next[l - 2] = position.y;
        next[l - 1] = position.z;

        this.attributes.position.needsUpdate = true;
        this.attributes.previous.needsUpdate = true;
        this.attributes.next.needsUpdate = true;

    };
}

export function memcpy(src: any, srcOffset: number, dst: { [x: string]: any; subarray: any; slice: any; buffer: any; set: (arg0: any, arg1: any) => void; }, dstOffset: number, length: number) {
    var i

    src = src.subarray || src.slice ? src : src.buffer
    dst = dst.subarray || dst.slice ? dst : dst.buffer

    src = srcOffset ? src.subarray ?
        src.subarray(srcOffset, length && srcOffset + length) :
        src.slice(srcOffset, length && srcOffset + length) : src

    if (dst.set) {
        dst.set(src, dstOffset)
    } else {
        for (i = 0; i < src.length; i++) {
            dst[i + dstOffset] = src[i]
        }
    }

    return dst
}

/**
 * Fast method to advance the line by one position.  The oldest position is removed.
 * @param position
 */


ShaderChunk['meshline_vert'] = [
    '',
    ShaderChunk.logdepthbuf_pars_vertex,
    ShaderChunk.fog_pars_vertex,
    '',
    'attribute vec3 previous;',
    'attribute vec3 next;',
    'attribute float side;',
    'attribute float width;',
    'attribute float counters;',
    '',
    'uniform vec2 resolution;',
    'uniform float lineWidth;',
    'uniform vec3 color;',
    'uniform float opacity;',
    'uniform float near;',
    'uniform float far;',
    'uniform float sizeAttenuation;',
    '',
    'varying vec2 vUV;',
    'varying vec4 vColor;',
    'varying float vCounters;',
    '',
    'vec2 fix( vec4 i, float aspect ) {',
    '',
    '    vec2 res = i.xy / i.w;',
    '    res.x *= aspect;',
    '	 vCounters = counters;',
    '    return res;',
    '',
    '}',
    '',
    'void main() {',
    '',
    '    float aspect = resolution.x / resolution.y;',
    '    float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
    '',
    '    vColor = vec4( color, opacity );',
    '    vUV = uv;',
    '',
    '    mat4 m = projectionMatrix * modelViewMatrix;',
    '    vec4 finalPosition = m * vec4( position, 1.0 );',
    '    vec4 prevPos = m * vec4( previous, 1.0 );',
    '    vec4 nextPos = m * vec4( next, 1.0 );',
    '',
    '    vec2 currentP = fix( finalPosition, aspect );',
    '    vec2 prevP = fix( prevPos, aspect );',
    '    vec2 nextP = fix( nextPos, aspect );',
    '',
    '    float pixelWidth = finalPosition.w * pixelWidthRatio;',
    '    float w = 1.8 * pixelWidth * lineWidth * width;',
    '',
    '    if( sizeAttenuation == 1. ) {',
    '        w = 1.8 * lineWidth * width;',
    '    }',
    '',
    '    vec2 dir;',
    '    if( nextP == currentP ) dir = normalize( currentP - prevP );',
    '    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
    '    else {',
    '        vec2 dir1 = normalize( currentP - prevP );',
    '        vec2 dir2 = normalize( nextP - currentP );',
    '        dir = normalize( dir1 + dir2 );',
    '',
    '        vec2 perp = vec2( -dir1.y, dir1.x );',
    '        vec2 miter = vec2( -dir.y, dir.x );',
    '        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
    '',
    '    }',
    '',
    '    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
    '    vec2 normal = vec2( -dir.y, dir.x );',
    '    normal.x /= aspect;',
    '    normal *= .5 * w;',
    '',
    '    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
    '    finalPosition.xy += offset.xy;',
    '',
    '    gl_Position = finalPosition;',
    '',
    ShaderChunk.logdepthbuf_vertex,
    ShaderChunk.fog_vertex && '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
    ShaderChunk.fog_vertex,
    '}'
].join('\r\n');

ShaderChunk['meshline_frag'] = [
    '',
    ShaderChunk.fog_pars_fragment,
    ShaderChunk.logdepthbuf_pars_fragment,
    '',
    'uniform sampler2D map;',
    'uniform sampler2D alphaMap;',
    'uniform float useMap;',
    'uniform float useAlphaMap;',
    'uniform float useDash;',
    'uniform float dashArray;',
    'uniform float dashOffset;',
    'uniform float dashRatio;',
    'uniform float visibility;',
    'uniform float alphaTest;',
    'uniform vec2 repeat;',
    '',
    'varying vec2 vUV;',
    'varying vec4 vColor;',
    'varying float vCounters;',
    '',
    'void main() {',
    '',
    ShaderChunk.logdepthbuf_fragment,
    '',
    '    vec4 c = vColor;',
    '    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );',
    '    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;',
    '    if( c.a < alphaTest ) discard;',
    '    if( useDash == 1. ){',
    '        c.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));',
    '    }',
    '    gl_FragColor = c;',
    '    gl_FragColor.a *= step(vCounters, visibility);',
    '',
    ShaderChunk.fog_fragment,
    '}'
].join('\r\n');

export class MeshLineMaterial extends ShaderMaterial {
    [x: string]: any;
    constructor(parameters: any) {
        super({
            uniforms: Object.assign({},
                UniformsLib.fog,
                {
                    lineWidth: { value: 1 },
                    map: { value: null },
                    useMap: { value: 0 },
                    alphaMap: { value: null },
                    useAlphaMap: { value: 0 },
                    color: { value: new Color(0xffffff) },
                    opacity: { value: 1 },
                    resolution: { value: new Vector2(1, 1) },
                    sizeAttenuation: { value: 1 },
                    near: { value: 1 },
                    far: { value: 1 },
                    dashArray: { value: 0 },
                    dashOffset: { value: 0 },
                    dashRatio: { value: 0.5 },
                    useDash: { value: 0 },
                    visibility: { value: 1 },
                    alphaTest: { value: 0 },
                    repeat: { value: new Vector2(1, 1) },
                }
            ),

            vertexShader: ShaderChunk.meshline_vert,

            fragmentShader: ShaderChunk.meshline_frag,

        });

        this.type = 'MeshLineMaterial';

        Object.defineProperties(this, {
            lineWidth: {
                enumerable: true,
                get: function () {
                    return this.uniforms.lineWidth.value;
                },
                set: function (value) {
                    this.uniforms.lineWidth.value = value;
                }
            },
            map: {
                enumerable: true,
                get: function () {
                    return this.uniforms.map.value;
                },
                set: function (value) {
                    this.uniforms.map.value = value;
                }
            },
            useMap: {
                enumerable: true,
                get: function () {
                    return this.uniforms.useMap.value;
                },
                set: function (value) {
                    this.uniforms.useMap.value = value;
                }
            },
            alphaMap: {
                enumerable: true,
                get: function () {
                    return this.uniforms.alphaMap.value;
                },
                set: function (value) {
                    this.uniforms.alphaMap.value = value;
                }
            },
            useAlphaMap: {
                enumerable: true,
                get: function () {
                    return this.uniforms.useAlphaMap.value;
                },
                set: function (value) {
                    this.uniforms.useAlphaMap.value = value;
                }
            },
            color: {
                enumerable: true,
                get: function () {
                    return this.uniforms.color.value;
                },
                set: function (value) {
                    this.uniforms.color.value = value;
                }
            },
            opacity: {
                enumerable: true,
                get: function () {
                    return this.uniforms.opacity.value;
                },
                set: function (value) {
                    this.uniforms.opacity.value = value;
                }
            },
            resolution: {
                enumerable: true,
                get: function () {
                    return this.uniforms.resolution.value;
                },
                set: function (value) {
                    this.uniforms.resolution.value.copy(value);
                }
            },
            sizeAttenuation: {
                enumerable: true,
                get: function () {
                    return this.uniforms.sizeAttenuation.value;
                },
                set: function (value) {
                    this.uniforms.sizeAttenuation.value = value;
                }
            },
            near: {
                enumerable: true,
                get: function () {
                    return this.uniforms.near.value;
                },
                set: function (value) {
                    this.uniforms.near.value = value;
                }
            },
            far: {
                enumerable: true,
                get: function () {
                    return this.uniforms.far.value;
                },
                set: function (value) {
                    this.uniforms.far.value = value;
                }
            },
            dashArray: {
                enumerable: true,
                get: function () {
                    return this.uniforms.dashArray.value;
                },
                set: function (value) {
                    this.uniforms.dashArray.value = value;
                    this.useDash = (value !== 0) ? 1 : 0
                }
            },
            dashOffset: {
                enumerable: true,
                get: function () {
                    return this.uniforms.dashOffset.value;
                },
                set: function (value) {
                    this.uniforms.dashOffset.value = value;
                }
            },
            dashRatio: {
                enumerable: true,
                get: function () {
                    return this.uniforms.dashRatio.value;
                },
                set: function (value) {
                    this.uniforms.dashRatio.value = value;
                }
            },
            useDash: {
                enumerable: true,
                get: function () {
                    return this.uniforms.useDash.value;
                },
                set: function (value) {
                    this.uniforms.useDash.value = value;
                }
            },
            visibility: {
                enumerable: true,
                get: function () {
                    return this.uniforms.visibility.value;
                },
                set: function (value) {
                    this.uniforms.visibility.value = value;
                }
            },
            alphaTest: {
                enumerable: true,
                get: function () {
                    return this.uniforms.alphaTest.value;
                },
                set: function (value) {
                    this.uniforms.alphaTest.value = value;
                }
            },
            repeat: {
                enumerable: true,
                get: function () {
                    return this.uniforms.repeat.value;
                },
                set: function (value) {
                    this.uniforms.repeat.value.copy(value);
                }
            },
        });

        this.isMeshLineMaterial = true;
        this.setValues(parameters);
    }


    copy(source: any) {

        ShaderMaterial.prototype.copy.call(this, source);

        this.lineWidth = source.lineWidth;
        this.map = source.map;
        this.useMap = source.useMap;
        this.alphaMap = source.alphaMap;
        this.useAlphaMap = source.useAlphaMap;
        this.color.copy(source.color);
        this.opacity = source.opacity;
        this.resolution.copy(source.resolution);
        this.sizeAttenuation = source.sizeAttenuation;
        this.near = source.near;
        this.far = source.far;
        this.dashArray.copy(source.dashArray);
        this.dashOffset.copy(source.dashOffset);
        this.dashRatio.copy(source.dashRatio);
        this.useDash = source.useDash;
        this.visibility = source.visibility;
        this.alphaTest = source.alphaTest;
        this.repeat.copy(source.repeat);

        return this;

    }

}


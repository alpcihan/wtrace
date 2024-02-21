//-------------------------------------------------------------------
// brdf eval
//-------------------------------------------------------------------
fn evalDiffuse(material: Material, NoL: f32, NoV: f32, LoH: f32, roughness: f32) -> vec3f {
    let FD90: f32 = 0.5 + 2.0 * roughness * pow(LoH, 2.0);
    let a: f32 = F_Schlick(1.0, FD90, NoL);
    let b: f32 = F_Schlick(1.0, FD90, NoV);
    
    return material.albedo * (a * b / PI);
}

fn evalSpecular(material: Material, F: vec3f, NoH: f32, NoV: f32, NoL: f32) -> vec3f {
    let roughness: f32 = pow(material.roughness, 2.0);
    let D: f32 = D_GTR(roughness, NoH, 2.0);
    let G: f32 = geometryTerm(NoL, NoV, pow(0.5 + material.roughness * 0.5, 2.0));

    let spec: vec3f = D * F * G / (4.0 * NoL * NoV);
    
    return spec;
}

fn sampleBRDF(v: vec3f, n: vec3f, material: Material, l: ptr<function, vec3f>, seed: ptr<function, u32>) -> vec4f {
    let roughness: f32 = pow(material.roughness, 2.0);
    
    // normal
    var t: vec3f;
    var b: vec3f;
    basis(n, &t, &b);

    // ggx
    var V: vec3f = toLocal(t,b,n,v);
    var h: vec3f = sampleGGXVNDF(V, roughness,roughness, frand(seed), frand(seed));
    if (h.z < 0.0) {
        h = -h;
    }
    h = toWorld(t,b,n,h);
    
    // fresnel
    let f0: vec3f = mix(vec3f(0.04), material.albedo, material.metallic);
    let F: vec3f = F_Schlick3(f0, dot(v,h));

    // lobe weight probability
    var diffW: f32 = (1.0 - material.metallic);
    var specW: f32 = luma(F);
   
    let invW: f32 = 1.0 / (diffW + specW);
    diffW *= invW;
    specW *= invW;
    
    var brdf: vec4f = vec4f(0.0);
    let rnd: f32 = frand(seed);

    // diffuse
    if (rnd < diffW) 
    {
        *l = cosineSampleHemisphere(n, seed);
        h = normalize(*l+v);
        
        let NoL: f32 = dot(n,*l);
        let NoV: f32 = dot(n,v);
        if (NoL <= 0. || NoV <= 0.0) { return vec4f(0.0); }
        let LoH: f32 = dot(*l,h);
        let pdf: f32 = NoL/PI;
        
        let diff: vec3f = evalDiffuse(material, NoL, NoV, LoH, roughness) * (1.0-F);
        brdf = vec4f(diff * NoL, diffW * pdf);
    } 
    
    // specular
    else 
    {
        *l = reflect(-v,h);
        
        let NoL: f32 = dot(n,*l);
        let NoV: f32 = dot(n,v);
        if ( NoL <= 0. || NoV <= 0. ) { return vec4(0.0); }
        let NoH: f32 = min(dot(n,h),0.99);
        let pdf: f32 = GGXVNDFPdf(NoH, NoV, roughness);
        
        let spec: vec3f = evalSpecular(material, F, NoH, NoV, NoL);
        brdf = vec4f(spec * NoL, specW * pdf);
    }

    return brdf;
}

//---------------------------------------
// brdf methods
//---------------------------------------
fn F_Schlick(f0: f32, f90: f32, theta: f32) -> f32 {
    return f0 + (f90 - f0) * pow(1.0 - theta, 5.0);
}

fn F_Schlick3(f0: vec3f, theta: f32) -> vec3f {
    return f0 + (vec3f(1.0) - f0) * pow(1.0 - theta, 5.0);
}

fn D_GTR(roughness: f32, NoH: f32, k: f32) -> f32 {
    let a2: f32 = pow(roughness, 2.0);
    return a2 / (PI * pow((NoH * NoH) * (a2 * a2 - 1.0) + 1.0, k));
}

fn SmithG(NDotV: f32, alphaG: f32) -> f32 {
    let a: f32 = alphaG * alphaG;
    let b: f32 = NDotV * NDotV;
    return (2.0 * NDotV) / (NDotV + sqrt(a + b - a * b));
}

fn geometryTerm(NoL: f32, NoV: f32, roughness: f32) -> f32 {
    let a2: f32 = roughness * roughness;
    let G1: f32 = SmithG(NoV, a2);
    let G2: f32 = SmithG(NoL, a2);
    return G1 * G2;
}

fn sampleGGXVNDF(V: vec3f, ax: f32, ay: f32, r1: f32, r2: f32) -> vec3f {
    let Vh: vec3f = normalize(vec3f(ax * V.x, ay * V.y, V.z));

    let lensq: f32 = Vh.x * Vh.x + Vh.y * Vh.y;
    var T1: vec3f;
    if (lensq > 0.0) {
        T1 = vec3f(-Vh.y, Vh.x, 0.0) * inversesqrt(lensq);
    } else {
        T1 = vec3f(1.0, 0.0, 0.0);
    }
    let T2: vec3f = cross(Vh, T1);

    let r: f32 = sqrt(r1);
    let phi: f32 = 2.0 * PI * r2;
    let t1: f32 = r * cos(phi);
    let t2: f32 = r * sin(phi);
    let s: f32 = 0.5 * (1.0 + Vh.z);
    let t2_modified: f32 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

    let Nh: vec3f = t1 * T1 + t2_modified * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2_modified * t2_modified)) * Vh;

    return normalize(vec3f(ax * Nh.x, ay * Nh.y, max(0.0, Nh.z)));
}

fn GGXVNDFPdf(NoH: f32, NoV: f32, roughness: f32) -> f32 {
    let D: f32 = D_GTR(roughness, NoH, 2.0);
    let G1: f32 = SmithG(NoV, roughness * roughness);
    return (D * G1) / max(0.00001, 4.0 * NoV);
}
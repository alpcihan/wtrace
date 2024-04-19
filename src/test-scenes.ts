import * as THREE from "three";
import * as wt from "../lib/wtrace";
import { degToRad } from "three/src/math/MathUtils";

export async function createCornellBoxScene(): Promise<wt.Scene> {
    // create the scene
    let scene: wt.Scene = new wt.Scene();

    // load the cube model (TODO: make async)
    let mesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/cube.obj");
    if (mesh === undefined) return scene;

    // create the scene manually
    const scale: number = 5;

    // bottom wall
    let bottomWallMat: wt.Material = new wt.Material();
    bottomWallMat.baseColor = new THREE.Vector3(1, 1, 1);
    bottomWallMat.roughness = 0.25;
    bottomWallMat.metallic = 0.75;
    let bottomWallMod: wt.MeshModel = new wt.MeshModel(mesh, bottomWallMat);
    bottomWallMod.position = new THREE.Vector3(0, 0, 0);
    bottomWallMod.scale = new THREE.Vector3(scale, 0.01 * scale, scale);
    scene.add(bottomWallMod);

    // right wall
    let rightWallMat: wt.Material = new wt.Material();
    rightWallMat.baseColor = new THREE.Vector3(0, 1, 0);
    rightWallMat.roughness = 0.75;
    rightWallMat.metallic = 0.25;
    let rightWallMod: wt.MeshModel = new wt.MeshModel(mesh, rightWallMat);
    rightWallMod.position = new THREE.Vector3(0.5 * scale, 0.5 * scale, 0);
    rightWallMod.scale = new THREE.Vector3(0.01 * scale, scale, scale);
    scene.add(rightWallMod);

    // left wall
    let leftWallMat: wt.Material = new wt.Material();
    leftWallMat.baseColor = new THREE.Vector3(1, 0, 0);
    leftWallMat.roughness = 0.75;
    leftWallMat.metallic = 0.25;
    let leftWallMod: wt.MeshModel = new wt.MeshModel(mesh, leftWallMat);
    leftWallMod.position = new THREE.Vector3(-0.5 * scale, 0.5 * scale, 0);
    leftWallMod.scale = new THREE.Vector3(0.01 * scale, scale, scale);
    scene.add(leftWallMod);

    // top wall
    let topWallMat: wt.Material = new wt.Material();
    topWallMat.baseColor = new THREE.Vector3(1, 1, 1);
    topWallMat.roughness = 0.75;
    topWallMat.metallic = 0.25;
    let topWallMod: wt.MeshModel = new wt.MeshModel(mesh, topWallMat);
    topWallMod.position = new THREE.Vector3(0, scale, 0);
    topWallMod.scale = new THREE.Vector3(scale, 0.01 * scale, scale);
    scene.add(topWallMod);

    // back wall
    let backWallMat: wt.Material = new wt.Material();
    backWallMat.baseColor = new THREE.Vector3(1, 1, 1);
    backWallMat.roughness = 0.75;
    backWallMat.metallic = 0.25;
    let backWallMod: wt.MeshModel = new wt.MeshModel(mesh, backWallMat);
    backWallMod.position = new THREE.Vector3(0, 0.5 * scale, -0.5 * scale);
    backWallMod.scale = new THREE.Vector3(scale, scale, 0.01 * scale);
    scene.add(backWallMod);

    // light
    let lightMat: wt.Material = new wt.Material();
    lightMat.roughness = 1;
    lightMat.metallic = 0;
    lightMat.baseColor = new THREE.Vector3(1, 1, 1);
    lightMat.emissiveColor = new THREE.Vector3(20, 20, 20);
    let lightMod: wt.MeshModel = new wt.MeshModel(mesh, lightMat);
    lightMod.position = new THREE.Vector3(0, scale - 0.005, 0);
    lightMod.scale = new THREE.Vector3(scale * 0.3, 0.01 * scale, scale * 0.3);
    scene.add(lightMod);

    // object
    let objMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/xyz.obj");
    if (objMesh === undefined) return scene;

    let objMaterial: wt.Material = new wt.Material();
    objMaterial.baseColor = new THREE.Vector3(0.5, 0.5, 0.5);
    lightMat.roughness = 0.9;
    lightMat.metallic = 0.1;

    let objModel: wt.MeshModel = new wt.MeshModel(objMesh, objMaterial);
    objModel.position = new THREE.Vector3(0, 1, 0);
    objModel.euler = new THREE.Euler(0, degToRad(225), 0);

    objModel.scale = new THREE.Vector3(0.025, 0.025, 0.025);
    scene.add(objModel);

    return scene;
}

export async function createXYZDragonScene(): Promise<wt.Scene> {
    // create the scene
    let scene: wt.Scene = new wt.Scene();

    // load the cube model (TODO: make async)
    let mesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/xyz.obj");
    if (mesh === undefined) return scene;

    // xyz
    let material: wt.Material = new wt.Material();
    let model: wt.MeshModel = new wt.MeshModel(mesh, material);
    model.position = new THREE.Vector3(0, 0, 0);
    model.scale = new THREE.Vector3(0.025, 0.025, 0.025);
    scene.add(model);

    return scene;
}

export async function createBoxScene(): Promise<wt.Scene> {
    let scene: wt.Scene = new wt.Scene();

    // load the cube model (TODO: make async)
    let mesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/cube.obj");
    if (mesh === undefined) {
        console.log("Mesh is undefined");
        return scene;
    }

    // left wall
    let leftWallMat: wt.Material = new wt.Material();
    leftWallMat.baseColor = new THREE.Vector3(1, 0, 0);
    leftWallMat.roughness = 0.75;
    leftWallMat.metallic = 0.25;
    let leftWallMod: wt.MeshModel = new wt.MeshModel(mesh, leftWallMat);
    leftWallMod.position = new THREE.Vector3(0, 0, 0);
    leftWallMod.scale = new THREE.Vector3(1, 1, 1);
    scene.add(leftWallMod);

    return scene;
}

export async function createGLTFDamagedHelmet(): Promise<wt.Scene> {
    // create the scene
    let scene: wt.Scene = new wt.Scene();

    // load the gltf model
    const meshModels: wt.MeshModel[] = await wt.WTGLTFLoader.load("assets/DamagedHelmet.glb");
    meshModels.forEach(meshModel => scene.add(meshModel));

    // load the cube model (TODO: make async)
    let cubeMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/cube.obj");
    if (cubeMesh === undefined) return scene;

    // create the scene manually
    const scale: number = 5;

    // bottom wall
    let bottomWallMat: wt.Material = new wt.Material();
    bottomWallMat.baseColor = new THREE.Vector3(1, 1, 1);
    bottomWallMat.roughness = 0.25;
    bottomWallMat.metallic = 0.75;
    let bottomWallMod: wt.MeshModel = new wt.MeshModel(cubeMesh, bottomWallMat);
    bottomWallMod.position = new THREE.Vector3(0, -1, 0);
    bottomWallMod.scale = new THREE.Vector3(scale, 0.01 * scale, scale);
    scene.add(bottomWallMod);

    // right wall
    let rightWallMat: wt.Material = new wt.Material();
    rightWallMat.baseColor = new THREE.Vector3(0, 1, 0);
    rightWallMat.roughness = 0.75;
    rightWallMat.metallic = 0.25;
    let rightWallMod: wt.MeshModel = new wt.MeshModel(cubeMesh, rightWallMat);
    rightWallMod.position = new THREE.Vector3(0.5 * scale, 0.5 * scale - 1, 0);
    rightWallMod.scale = new THREE.Vector3(0.01 * scale, scale, scale);
    scene.add(rightWallMod);

    // left wall
    let leftWallMat: wt.Material = new wt.Material();
    leftWallMat.baseColor = new THREE.Vector3(1, 0, 0);
    leftWallMat.roughness = 0.75;
    leftWallMat.metallic = 0.25;
    let leftWallMod: wt.MeshModel = new wt.MeshModel(cubeMesh, leftWallMat);
    leftWallMod.position = new THREE.Vector3(-0.5 * scale, 0.5 * scale - 1, 0);
    leftWallMod.scale = new THREE.Vector3(0.01 * scale, scale, scale);
    scene.add(leftWallMod);

    // top wall
    let topWallMat: wt.Material = new wt.Material();
    topWallMat.baseColor = new THREE.Vector3(1, 1, 1);
    topWallMat.roughness = 0.75;
    topWallMat.metallic = 0.25;
    let topWallMod: wt.MeshModel = new wt.MeshModel(cubeMesh, topWallMat);
    topWallMod.position = new THREE.Vector3(0, scale - 1, 0);
    topWallMod.scale = new THREE.Vector3(scale, 0.01 * scale, scale);
    scene.add(topWallMod);

    // back wall
    let backWallMat: wt.Material = new wt.Material();
    backWallMat.baseColor = new THREE.Vector3(1, 1, 1);
    backWallMat.roughness = 0.75;
    backWallMat.metallic = 0.25;
    let backWallMod: wt.MeshModel = new wt.MeshModel(cubeMesh, backWallMat);
    backWallMod.position = new THREE.Vector3(0, 0.5 * scale - 1, -0.5 * scale);
    backWallMod.scale = new THREE.Vector3(scale, scale, 0.01 * scale);
    scene.add(backWallMod);

    // light
    let lightMat: wt.Material = new wt.Material();
    lightMat.roughness = 1;
    lightMat.metallic = 0;
    lightMat.baseColor = new THREE.Vector3(1, 1, 1);
    lightMat.emissiveColor = new THREE.Vector3(20, 20, 20);
    let lightMod: wt.MeshModel = new wt.MeshModel(cubeMesh, lightMat);
    lightMod.position = new THREE.Vector3(0, scale - 0.005 - 1, 0);
    lightMod.scale = new THREE.Vector3(scale * 0.3, 0.01 * scale, scale * 0.3);
    scene.add(lightMod);

    return scene;
}

export async function createMeetManScene(): Promise<wt.Scene> {
    // create the scene
    let scene: wt.Scene = new wt.Scene();

    // load meshes
    let headMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/models/meetman/head.obj");
    let bodyMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/models/meetman/body.obj");
    let xyzMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/xyz.obj");
    let cubeMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/cube.obj");
    if (xyzMesh === undefined || headMesh === undefined || bodyMesh === undefined || cubeMesh === undefined ) return scene;

    // load materials, true
    let headMat: wt.Material = new wt.Material();
    headMat.albedoMap = await wt.TextureLoader.load("assets/textures/01_Head_Base_Color.jpg", true);
    headMat.metallicMap = await wt.TextureLoader.load("assets/textures/01_Head_MetallicRoughness.jpg", true);

    let bodyMat: wt.Material = new wt.Material();
    bodyMat.albedoMap = await wt.TextureLoader.load("assets/textures/02_Body_Base_Color.jpg", true);
    bodyMat.metallicMap = await wt.TextureLoader.load("assets/textures/02_Body_MetallicRoughness.jpg", true);

    let xyzMat: wt.Material = new wt.Material();
    xyzMat.baseColor = new THREE.Vector3(0.8, 0.3, 0.3);
    xyzMat.roughness = 0.75;
    xyzMat.metallic = 0.25;

    let lightMat: wt.Material = new wt.Material();
    lightMat.roughness = 1;
    lightMat.metallic = 0;
    lightMat.baseColor = new THREE.Vector3(1, 1, 1);
    lightMat.emissiveColor = new THREE.Vector3(3, 3, 3);

    // create models
    let headMod1: wt.MeshModel = new wt.MeshModel(headMesh, headMat);
    headMod1.position = new THREE.Vector3(0, 0, -7);
    headMod1.euler = new THREE.Euler(0, degToRad(-30), 0);
    headMod1.scale = new THREE.Vector3(100, 100, 100);
    scene.add(headMod1);

    let bodyMod1: wt.MeshModel = new wt.MeshModel(bodyMesh, bodyMat);
    bodyMod1.position = new THREE.Vector3(0, 0, -7);
    bodyMod1.euler = new THREE.Euler(0, degToRad(-45), 0);
    bodyMod1.scale = new THREE.Vector3(100, 100, 100);
    scene.add(bodyMod1);

    let headMod2: wt.MeshModel = new wt.MeshModel(headMesh, headMat);
    headMod2.position = new THREE.Vector3(0, 0, 2);
    headMod2.euler = new THREE.Euler(0, degToRad(45), 0);
    headMod2.scale = new THREE.Vector3(100, 100, 100);
    scene.add(headMod2);

    let bodyMod2: wt.MeshModel = new wt.MeshModel(bodyMesh, bodyMat);
    bodyMod2.position = new THREE.Vector3(0, 0, 2);
    bodyMod2.euler = new THREE.Euler(0, degToRad(50), 0);
    bodyMod2.scale = new THREE.Vector3(100, 100, 100);
    scene.add(bodyMod2);

    let xyzMod: wt.MeshModel = new wt.MeshModel(xyzMesh, xyzMat);
    xyzMod.position = new THREE.Vector3(-10, 10, 10);
    xyzMod.euler = new THREE.Euler(0, 0, 0);
    xyzMod.scale = new THREE.Vector3(0.25, 0.25, 0.25);
    scene.add(xyzMod);

    let lightMod: wt.MeshModel = new wt.MeshModel(cubeMesh, lightMat);
    lightMod.position = new THREE.Vector3(0, 30, -40);
    lightMod.euler = new THREE.Euler(degToRad(-45), 0, 0);
    lightMod.scale = new THREE.Vector3(90, 0.05, 35);
    scene.add(lightMod);
    
    return scene;
}

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
    lightMat.emissiveColor = new THREE.Vector3(20,20,20);
    let lightMod: wt.MeshModel = new wt.MeshModel(mesh, lightMat);
    lightMod.position = new THREE.Vector3(0, scale - 0.005, 0);
    lightMod.scale = new THREE.Vector3(scale * 0.3, 0.01 * scale, scale * 0.3);
    scene.add(lightMod);

    // object
    let objMesh: wt.Mesh | undefined = await wt.MeshLoader.load("assets/xyz.obj");
    if (objMesh === undefined) return scene;

    let objMaterial: wt.Material = new wt.Material();
    objMaterial.baseColor = new THREE.Vector3(0.5,0.5,0.5);
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
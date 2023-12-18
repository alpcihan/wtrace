import * as THREE from "three";
import { Key } from "./input-system-types";
import { InputSystem } from "./input-system";

interface CameraControllerProps {
	camera: THREE.PerspectiveCamera;
}

class CameraController {
	constructor(props: CameraControllerProps) {
		this.m_camera = props.camera;
	}

	public forwardInput: Key 				= Key.KeyW;
	public backwardInput: Key 				= Key.KeyS;
	public rightInput: Key 					= Key.KeyD;
	public leftInput: Key 					= Key.KeyA;
	public upInput: Key						= Key.KeyShift;
	public downInput: Key					= Key.KeySpace;
	public pitchInput: Key 					= Key.KeyArrowUp;
	public yawnInput: Key 					= Key.KeyArrowRight;
	public pitchCounterClockwiseInput: Key 	= Key.KeyArrowDown;
	public yawnCounterClockwiseInput: Key 	= Key.KeyArrowLeft;
	
	public speed: number					= 1;
	public rotationSpeed: number			= 30;

	public update(deltaTime: number) {
		this.m_isUpdated = false; 

		// update the camera vectors
		const deltaSpeed = this.speed * deltaTime;
		const deltaRotateSpeed = this.rotationSpeed * deltaTime;

		if(InputSystem.isKeyPressed(this.forwardInput)) 	{ this.m_camera.translateZ(deltaSpeed); this.m_isUpdated = true; }
		if(InputSystem.isKeyPressed(this.backwardInput)) 	{ this.m_camera.translateZ(-deltaSpeed); this.m_isUpdated = true; }
		if(InputSystem.isKeyPressed(this.upInput)) 			{ this.m_camera.position.y += deltaSpeed; this.m_isUpdated = true; }
		if(InputSystem.isKeyPressed(this.downInput)) 		{ this.m_camera.position.y -= deltaSpeed; this.m_isUpdated = true; }
		if(InputSystem.isKeyPressed(this.rightInput)) 		{ this.m_camera.position.x -= deltaSpeed; this.m_isUpdated = true; }
		if(InputSystem.isKeyPressed(this.leftInput)) 		{ this.m_camera.position.x += deltaSpeed; this.m_isUpdated = true; }

		if(!this.m_isUpdated) return;

		this.m_camera.updateMatrix();
		this.m_camera.updateMatrixWorld(true);
    }

	public isUpdated(): boolean {
		return this.m_isUpdated;
	}

	private m_camera: THREE.PerspectiveCamera;
	private m_isUpdated: boolean;
}

export { CameraController };
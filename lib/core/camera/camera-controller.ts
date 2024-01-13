import * as THREE from "three";
import { Key } from "../input/input-system-types";
import { InputSystem } from "../input/input-system";
import { clamp } from "three/src/math/MathUtils";

const CAMERA_CONTROLLER_PITCH_LIMIT: number = 89 * THREE.MathUtils.DEG2RAD;

interface CameraControllerProps {
	camera: THREE.PerspectiveCamera;
}

interface CameraControllerInputs {
	forwardInput: Key;
	backwardInput: Key;
	rightInput: Key;
	leftInput: Key;
	upInput: Key;
	downInput: Key;
	pitchInput: Key;
	yawnInput: Key;
	pitchCounterClockwiseInput: Key;
	yawnCounterClockwiseInput: Key;
}

class CameraController {
	constructor(props: CameraControllerProps) {
		this.m_camera = props.camera;

		// TODO: read rest from the camera
		this.m_euler = new THREE.Vector3(0,0,0); 
	}

	public inputs: CameraControllerInputs = {
		forwardInput: Key.KeyW,
		backwardInput: Key.KeyS,
		rightInput: Key.KeyD,
		leftInput: Key.KeyA,
		upInput: Key.KeyShift,
		downInput: Key.KeySpace,
		pitchInput: Key.KeyArrowUp,
		yawnInput: Key.KeyArrowRight,
		pitchCounterClockwiseInput: Key.KeyArrowDown,
		yawnCounterClockwiseInput: Key.KeyArrowLeft,
	};

	public speed: number = 2;
	public rotationSpeed: number = 90;

	public update(deltaTime: number) {
		this.m_isUpdated = this._processInputs(deltaTime);
		
		if (!this.m_isUpdated) return;

		this.m_camera.updateMatrixWorld(true);
	}

	public isUpdated(): boolean {
		return this.m_isUpdated;
	}
	
	private m_camera: THREE.PerspectiveCamera;
	private m_isUpdated: boolean;
	private m_euler: THREE.Vector3;

	private _processInputs(deltaTime: number): boolean {
		const deltaSpeed = this.speed * deltaTime;
    	const deltaRotationSpeed = this.rotationSpeed * deltaTime * THREE.MathUtils.DEG2RAD;

		let isUpdated = false;

		// rotation inputs
		if (InputSystem.isKeyPressed(this.inputs.yawnInput)) {
			this.m_euler.y -= deltaRotationSpeed;
			isUpdated = true;
		}
    	if (InputSystem.isKeyPressed(this.inputs.yawnCounterClockwiseInput)) {
			this.m_euler.y += deltaRotationSpeed;
			isUpdated = true;
		}
		if (InputSystem.isKeyPressed(this.inputs.pitchInput)) {
			this.m_euler.x += deltaRotationSpeed;
			isUpdated = true;
		}
    	if (InputSystem.isKeyPressed(this.inputs.pitchCounterClockwiseInput)) {
			this.m_euler.x -= deltaRotationSpeed;
			isUpdated = true;
		}

		this.m_euler.x = clamp(this.m_euler.x, -CAMERA_CONTROLLER_PITCH_LIMIT, CAMERA_CONTROLLER_PITCH_LIMIT);
		
		// TODO: read the initial direction vectors from the camera instance
		let forward: THREE.Vector3 = new THREE.Vector3(0,0,-1);
		let right: THREE.Vector3 = new THREE.Vector3(1,0,0);
		let up: THREE.Vector3 = new THREE.Vector3(0,1,0);

		forward.applyAxisAngle(up, this.m_euler.y);
		right.applyAxisAngle(up, this.m_euler.y);
		forward.applyAxisAngle(right, this.m_euler.x);

		// translation inputs
		if (InputSystem.isKeyPressed(this.inputs.forwardInput)) {
			this.m_camera.position.add(forward.clone().multiplyScalar(deltaSpeed));
			isUpdated = true;
		}
		if (InputSystem.isKeyPressed(this.inputs.backwardInput)) {
			this.m_camera.position.add(forward.clone().multiplyScalar(-deltaSpeed));
			isUpdated = true;
		}
		if (InputSystem.isKeyPressed(this.inputs.rightInput)) {
			this.m_camera.position.add(right.clone().multiplyScalar(deltaSpeed));
			isUpdated = true;
		}
		if (InputSystem.isKeyPressed(this.inputs.leftInput)) {
			this.m_camera.position.add(right.clone().multiplyScalar(-deltaSpeed));
			isUpdated = true;
		}
		if (InputSystem.isKeyPressed(this.inputs.upInput)) {
			this.m_camera.position.add(up.clone().multiplyScalar(deltaSpeed));
			isUpdated = true;
		}
		if (InputSystem.isKeyPressed(this.inputs.downInput)) {
			this.m_camera.position.add(up.clone().multiplyScalar(-deltaSpeed));
			isUpdated = true;
		}

		this.m_camera.lookAt(this.m_camera.position.clone().add(forward));

		return isUpdated;
	}
}

export { CameraController };

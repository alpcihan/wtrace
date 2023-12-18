import { Key, stringToKey } from "./input-system-types";

class InputSystem {
	public static init() {
		if(InputSystem.m_isInitialized) return;
		InputSystem._init();
	}

    public static isKeyPressed(key: Key): boolean {
        return InputSystem.m_activeKeys.has(key);
    }

	private static m_activeKeys: Set<Key>;
	private static m_isInitialized: boolean = false; 

	private static _init() {
		InputSystem.m_activeKeys = new Set<Key>();
		InputSystem._initEventListeners();
		InputSystem.m_isInitialized = true;
	}

	private static _initEventListeners() {
		window.addEventListener("keydown", event => {
			const key: Key = stringToKey(event.key);
			if (key === Key.Unknown) return;
			InputSystem.m_activeKeys.add(key);
		});

		window.addEventListener("keyup", event => {
			const key: Key = stringToKey(event.key);
            if (key === Key.Unknown) return;
			InputSystem.m_activeKeys.delete(key);
		});
	}
}

export { InputSystem };
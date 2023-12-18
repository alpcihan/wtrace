enum Key {
	KeyA,
	KeyB,
	KeyC,
	KeyD,
	KeyE,
	KeyF,
	KeyG,
	KeyH,
	KeyI,
	KeyJ,
	KeyK,
	KeyL,
	KeyM,
	KeyN,
	KeyO,
	KeyP,
	KeyQ,
	KeyR,
	KeyS,
	KeyT,
	KeyU,
	KeyV,
	KeyW,
	KeyX,
	KeyY,
	KeyZ,
	Key0,
	Key1,
	Key2,
	Key3,
	Key4,
	Key5,
	Key6,
	Key7,
	Key8,
	Key9,
	KeySpace,
	KeyEnter,
	KeyTab,
	KeyShift,
	KeyCtrl,
	KeyAlt,
	KeyEsc,
    KeyArrowUp,
    KeyArrowDown,
    KeyArrowRight,
    KeyArrowLeft,
	Unknown,
}

function stringToKey(str: string): Key {
    var key = stringToKeyMap.get(str);
    if(key === undefined) key = Key.Unknown;
    return key;
}

const stringToKeyMap: Map<string, Key> = new Map([
    ["A", Key.KeyA],
    ["B", Key.KeyB],
    ["C", Key.KeyC],
    ["D", Key.KeyD],
    ["E", Key.KeyE],
    ["F", Key.KeyF],
    ["G", Key.KeyG],
    ["H", Key.KeyH],
    ["I", Key.KeyI],
    ["J", Key.KeyJ],
    ["K", Key.KeyK],
    ["L", Key.KeyL],
    ["M", Key.KeyM],
    ["N", Key.KeyN],
    ["O", Key.KeyO],
    ["P", Key.KeyP],
    ["Q", Key.KeyQ],
    ["R", Key.KeyR],
    ["S", Key.KeyS],
    ["T", Key.KeyT],
    ["U", Key.KeyU],
    ["V", Key.KeyV],
    ["W", Key.KeyW],
    ["X", Key.KeyX],
    ["Y", Key.KeyY],
    ["Z", Key.KeyZ],
    ["a", Key.KeyA],
    ["b", Key.KeyB],
    ["c", Key.KeyC],
    ["d", Key.KeyD],
    ["e", Key.KeyE],
    ["f", Key.KeyF],
    ["g", Key.KeyG],
    ["h", Key.KeyH],
    ["i", Key.KeyI],
    ["j", Key.KeyJ],
    ["k", Key.KeyK],
    ["l", Key.KeyL],
    ["m", Key.KeyM],
    ["n", Key.KeyN],
    ["o", Key.KeyO],
    ["p", Key.KeyP],
    ["q", Key.KeyQ],
    ["r", Key.KeyR],
    ["s", Key.KeyS],
    ["t", Key.KeyT],
    ["u", Key.KeyU],
    ["v", Key.KeyV],
    ["w", Key.KeyW],
    ["x", Key.KeyX],
    ["y", Key.KeyY],
    ["z", Key.KeyZ],
    ["0", Key.Key0],
    ["1", Key.Key1],
    ["2", Key.Key2],
    ["3", Key.Key3],
    ["4", Key.Key4],
    ["5", Key.Key5],
    ["6", Key.Key6],
    ["7", Key.Key7],
    ["8", Key.Key8],
    ["9", Key.Key9],
    ["Space", Key.KeySpace],
    ["Enter", Key.KeyEnter],
    ["Tab", Key.KeyTab],
    ["Shift", Key.KeyShift],
    ["Ctrl", Key.KeyCtrl],
    ["Alt", Key.KeyAlt],
    ["Esc", Key.KeyEsc],
    ["ArrowUp", Key.KeyArrowUp],
    ["ArrowDown", Key.KeyArrowDown],
    ["ArrowLeft", Key.KeyArrowLeft],
    ["ArrowRight", Key.KeyArrowRight],
]);

export { Key, stringToKey };
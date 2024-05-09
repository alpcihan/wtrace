import { Texture } from "../wtrace";

class TextureLoader {
    public static async load(path: string, flipY: boolean = false): Promise<Texture | undefined > {
        const response: Response = await fetch(path);
        
        // Check if the request was successful
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return undefined;
        }

        const blob = await response.blob();
        const imageData: ImageBitmap = await createImageBitmap(blob, {
            // resizeQuality: ResizeQuality;
            resizeHeight: 1024,
            resizeWidth: 1024,
            imageOrientation: flipY ? "flipY" : "none"
        }); 
        
        return new Texture(imageData);
    }
}

export { TextureLoader };
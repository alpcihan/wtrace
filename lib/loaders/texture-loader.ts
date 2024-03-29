import { Texture } from "../wtrace";

class TextureLoader {

    public static async load(path: string): Promise<Texture | undefined > {
        const response: Response = await fetch(path);
        
        // Check if the request was successful
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return undefined;
        }

        const blob = await response.blob();
        const imageData: ImageBitmap = await createImageBitmap(blob); 
        
        return new Texture(imageData);
    }
}

export { TextureLoader };
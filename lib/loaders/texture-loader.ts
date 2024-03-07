import { Texture } from "../wtrace";

class TextureLoader {

    public static async load(path: string, flip: boolean = true): Promise<Texture | undefined > {
        const response: Response = await fetch(path);
        
        // Check if the request was successful
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return undefined;
        }

        const blob = await response.blob();
        let imageData: ImageBitmap = await createImageBitmap(blob);

        // Flip the image if required
        if (flip) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imageData.width;
            canvas.height = imageData.height;

            ctx!.scale(1, -1);
            ctx!.drawImage(imageData, 0, -imageData.height);
            imageData = await createImageBitmap(canvas);
        }
        
        return new Texture(imageData);
    }
}

export { TextureLoader };
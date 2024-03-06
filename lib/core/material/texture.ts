class Texture {
    public data: ImageBitmap;
    //TODO: clean data on destruction
    public constructor(data: ImageBitmap) {
        this.data = data;
    };
}

export { Texture };
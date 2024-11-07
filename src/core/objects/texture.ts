class Texture {
    public id: string;
    public data: ImageBitmap;
    
    //TODO: clean data on destruction
    public constructor(path:string, data: ImageBitmap|undefined) {
        this.id = path;
        
        if(data !== undefined)
        {
            this.data = data;
        }
    };
}

export { Texture };
const path = require("path");
const bundleOutputDir = "./dist";

module.exports = {
    entry: {
        main: "./src/wtrace"  
    },
    output: {
        filename: "wtrace.bundle.js",
        path: path.join(__dirname, bundleOutputDir),
        library: 'wtrace',
        libraryTarget: 'umd',   // Important
        umdNamedDefine: true   // Important
    },
    devtool: "source-map",
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: ['/node_modules/']
            },            
            { test: /\.tsx?$/, loader: "ts-loader" },        
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },
            { 
                test: /\.(wgsl|glsl|vs|fs)$/,
                loader: 'ts-shader-loader'
            }
        ]
    }
};
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "cheap-module-source-map",
  entry: {
    popup: "./src/popup.ts",
    background: "./src/background.ts",
    content: "./src/content.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,                    // ← wipes dist before every build
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
      vm:     require.resolve("vm-browserify"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer:  ["buffer", "Buffer"],
      process: "process/browser",
    }),
    new HtmlWebpackPlugin({
      template: "./public/popup.html",  // ← copies your HTML to dist/
      filename: "popup.html",
      chunks:   ["popup"],              // ← only injects popup.js
      inject:   false,                  // ← keeps your own <script> tag
    }),
    new CopyPlugin({
      patterns: [
        { from: "public/icon.png", to: "icon.png" },      // ← public/icon.png
        { from: "manifest.json",   to: "manifest.json" },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
};
noise.js is a 64x64 pixel precomputed blue noise texture.
It was created by Christoph Peters and downloaded from http://momentsingraphics.de/BlueNoise.html

The included PNG is converted to base64 and stored as a string inside of noise.js.
Storing the texture as a base64 instead of an image lets us include the texture in the javascript bundle directly.

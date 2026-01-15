import { Font } from '../font';


self.addEventListener('message', e => {
    let data = e.data;
    if (data.type == 'font_subset') {
        Font.subset(data.arrayBuffer, data.fontFile, data.fallbackBuffer).then(newBuffer => {
            data.type = 'font_subset_after';
            data.newBuffer = newBuffer;
            self.postMessage(data, [
                data.arrayBuffer,
                data.fallbackBuffer,
                newBuffer
            ]);
        });
    }
});
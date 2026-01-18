import { Font } from '../font';


self.addEventListener('message', e => {
    let data = e.data;
    if (data.type == 'font_subset') {
        Font.subset(data.arrayBuffer, data.fontFile, data.fallbackBuffer)
            .then(newBuffer => {
                data.type = 'font_subset_after';
                data.newBuffer = newBuffer;
                self.postMessage(data, [
                    data.arrayBuffer,
                    data.fallbackBuffer,
                    newBuffer
                ]);
            })
            .catch(err => {
                self.postMessage({
                    type: 'font_subset_error',
                    pageId: data.pageId,
                    fontFile: data.fontFile,
                    message: err?.message || String(err)
                });
            });
    }
});

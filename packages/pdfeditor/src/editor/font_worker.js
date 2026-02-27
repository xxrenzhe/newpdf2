import { Font } from '../font';


self.addEventListener('message', e => {
    let data = e.data;
    if (data.type == 'font_subset') {
        Font.subset(data.arrayBuffer, data.fontFile, data.fallbackBuffer).then(newBuffer => {
            self.postMessage({
                type: 'font_subset_after',
                requestId: data.requestId,
                pageId: data.pageId,
                fontFile: data.fontFile,
                newBuffer
            }, [newBuffer]);
        }).catch(error => {
            self.postMessage({
                type: 'font_subset_error',
                requestId: data.requestId,
                pageId: data.pageId,
                fontFile: data.fontFile,
                message: error?.message || String(error)
            });
        });
    }
});

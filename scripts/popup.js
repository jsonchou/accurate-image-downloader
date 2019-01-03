(function () {

    let app = new Vue({
        el: '#app',
        data: {
            config: {
                folder_name: 'accurate-tmp',
                width: 200,
                height: 300,
            },
            list: []
        },
        watch: {

        },
        methods: {
            downloadImages() {
                var checkedImages = [];
                for (var i = 0; i < visibleImages.length; i++) {
                    if ($('#image' + i).hasClass('checked')) {
                        checkedImages.push(visibleImages[i]);
                    }
                }
                ls.image_count = checkedImages.length;
                ls.image_number = 1;
                checkedImages.forEach(function (checkedImage) {
                    chrome.downloads.download({
                        url: checkedImage
                    });
                });
            },
            init() {
                let me = this;

                // Get images on the page
                chrome.windows.getCurrent(function (currentWindow) {
                    chrome.tabs.query({
                        active: true,
                        windowId: currentWindow.id
                    }, function (activeTabs) {
                        try {
                            chrome.tabs.executeScript(activeTabs[0].id, {
                                file: '/scripts/send_images.js',
                                allFrames: true
                            }, _ => {
                                let e = chrome.runtime.lastError;
                                if (e !== undefined) {
                                    console.log(tabId, _, e);
                                }
                            });
                        } catch (err) {
                            console.log(err)
                        }
                    });
                });

                chrome.runtime.onMessage.addListener(function (result) {
                    let list = me.list;
                    let arr = [];
                    if (Array.isArray(result.linkedImages)) {
                        arr = arr.concat(result.linkedImages)
                    }
                    if (Array.isArray(result.images)) {
                        arr = arr.concat(result.images)
                    }
                    arr.map(item => {
                        list.push({
                            url: item,
                            enable: true
                        });
                    })
                    me.list = list
                    console.log(111, me.list)
                });

            },
        },
        mounted() {
            let me = this;
            me.init();
        },
    })
})()
<template>
    <div class="template-inner">
        <div class="box flex mb20">
            <div class="dimension">
                <p class="flex"><label class="tc">W</label><input type="text" @blur="filterImg" data-tag="width" :value="width" class="width" />
                    <span>px</span></p>
                <p class="flex"><label class="tc">H</label><input type="text" @blur="filterImg" data-tag="height" :value="height" class="height" />
                    <span>px</span></p>
            </div>
            <input type="text" class="sub" :value="folder_name" placeholder="input a folder name" title="Set the name of the subfolder you want to download the images to." />
            <span class="btn" disabled="true">DOWNLOAD</span>
        </div>

        <div class="box-list">
            <div class="control-bar">
                <label><input type="checkbox" name="" checked> ALL </label>
            </div>
            <ul class="flex start">
                <li v-for="item in list" :key="index">
                    <p class="p1"><img :data-size="item.width +'-'+ item.height" :src="item.url"></p>
                    <p class="p2"><input type="checkbox" :checked="item.enable"></p>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
    import "./styles/main.css"

    const cacheKey = "accurate_tmp_storage"

    let cacheList = []

    export default {
        data() {
            return {
                width: '270',
                height: '128',
                folder_name: 'acccurate-temp',
                list: []
            }
        },
        watch: {

        },
        methods: {
            getCache(key) {
                return new Promise((resolve, reject) => {
                    try {
                        resolve(cacheList)
                    } catch (err) {
                        console.log('getCache', err)
                    }
                })
            },
            setCache(list) {
                return new Promise((resolve, reject) => {
                    cacheList = list
                    resolve(list)
                })
            },
            downloadImages: function() {
                var checkedImages = [];
                for (var i = 0; i < visibleImages.length; i++) {
                    if ($('#image' + i).hasClass('checked')) {
                        checkedImages.push(visibleImages[i]);
                    }
                }
                ls.image_count = checkedImages.length;
                ls.image_number = 1;
                checkedImages.forEach(function(checkedImage) {
                    chrome.downloads.download({
                        url: checkedImage
                    });
                });
            },
            async filterImg(e) {
                let me = this
                let cache = await me.getCache(cacheKey).catch(err => {
                    console.log(err)
                })

                if (e) {
                    console.log(e, 'e filterImg')
                    let { tag } = e.target.dataset
                    me[tag] = e.target.value
                }

                let w = me.width
                let h = me.height

                if (cache && cache.length && w && h) {
                    console.log('filterImg 111', cache)
                    let tmp = cache.filter(c => {
                        return c.width == w && c.height == h
                    })
                    me.list = tmp
                    return tmp
                }
                return []
            },
            getImgInfo(url) {

                return new Promise((resolve, reject) => {
                    let width, height
                    let img = new Image()
                    img.src = url
                    if (img.complete) {
                        width = img.width
                        height = img.height
                        resolve({
                            width,
                            height
                        })
                    } else {
                        img.onload = function() {
                            width = img.width
                            height = img.height
                            resolve({
                                width,
                                height
                            })
                        }

                        img.onerror = function() {
                            reject('image onerror')
                        }
                    }
                })

            },
            async beforeCreate() {
                chrome.runtime.onStartup.addListener(function() {
                    console.log(1111, 'beforeCreate')
                    cacheList = []
                })
            },
            async init() {
                let me = this;
                // Get images on the page
                chrome.windows.getCurrent(function(currentWindow) {
                    chrome.tabs.query({
                        active: true,
                        windowId: currentWindow.id
                    }, function(activeTabs) {
                        try {
                            chrome.tabs.executeScript(activeTabs[0].id, {
                                file: '/libs/downloader.js',
                                allFrames: true
                            }, _ => {
                                let e = chrome.runtime.lastError;
                                if (e !== undefined) {
                                    console.log(_, e);
                                }
                            });
                        } catch (err) {
                            console.log(err)
                        }
                    });
                });

                chrome.runtime.onMessage.addListener(async function(result) {
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
                    let proms = []
                    list.map(async item => {
                        proms.push(me.getImgInfo(item.url))
                    })

                    let res = await Promise.all(proms).catch(err => {
                        console.log(err)
                    })

                    res.map((item, index) => {
                        list[index].width = item.width;
                        list[index].height = item.height;
                    })

                    if (list && list.length) {
                        let doneSetCache = await me.setCache(list).catch(err => {
                            console.log(err)
                        })
                        cacheList = doneSetCache
                        await me.filterImg()
                    }

                });
            }
        },
        created: function() {
            let me = this;
            console.log('created')

        },
        mounted: function() {
            let me = this;
            console.log('mounted')
            me.init()
        },
    };
</script>
<template>
    <div class="template-inner">
        <div class="box flex mb20">
            <div class="dimension">
                <p class="flex"><label class="tc">W</label><input type="text" @input="filterImg" data-tag="width" :value="width" class="width" />
                    <span>px</span></p>
                <p class="flex"><label class="tc">H</label><input type="text" @input="filterImg" data-tag="height" :value="height" class="height" />
                    <span>px</span></p>
            </div>
            <input type="text" class="sub" :value="folder_name" placeholder="input a folder name" title="Set the name of the subfolder you want to download the images to." />
            <span class="btn" @click="downloadImages">DOWNLOAD</span>
        </div>

        <div class="box-list">
            <div class="control-bar">
                <label><input type="checkbox" class="vm" @change="checkAll" name="" :checked="all"> <label class="vm">ALL</label> </label>
            </div>
            <ul class="flex start">
                <li v-for="(item,index) in list" :key="index">
                    <div>
                        <p class="p1"><img :data-width="item.width" :data-height="item.height" :src="item.url"></p>
                        <p class="p2">
                            <input type="checkbox" :data-index="index" @change="checkSingle" :checked="item.enable">
                            <span>x:{{item.width}},y:{{item.height}}</span>
                        </p>
                    </div>
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
                all: true,
                width: '270',
                height: '128',
                folder_name: 'acccurate-temp',
                list: []
            }
        },
        watch: {

        },
        methods: {
            checkAll(e) {
                let me = this;
                me.all = !me.all
                let tmp = JSON.parse(JSON.stringify(me.list));
                tmp = tmp.map(c => {
                    c.enable = me.all
                    return c
                })
                me.list = tmp
            },
            checkSingle(e) {
                let me = this;
                let len = me.list.length
                let { index } = e.target.dataset
                let checked = e.target.checked;
                let tmp = JSON.parse(JSON.stringify(me.list));
                tmp[index].enable = checked
                me.list = tmp
                let len2 = me.list.filter(c => c.enable).length
                if (len == len2) {
                    me.all = true
                } else {
                    me.all = false
                }
            },
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
            downloadImages(e) {
                let me = this;
                me.list.filter(c => c.enable).forEach(item => {
                    item.url && chrome.downloads.download({
                        url: item.url
                    });
                });
            },
            async filterImg(e) {
                let me = this
                let cache = await me.getCache(cacheKey).catch(err => {
                    console.log(err)
                })

                if (e) {
                    let { tag } = e.target.dataset
                    me[tag] = e.target.value
                }

                let w = me.width
                let h = me.height

                if (cache && cache.length && w && h) {
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

                me.folder_name && chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
                    suggest({ filename: me.folder_name + "/" + item.filename });
                });

                chrome.runtime.onMessage.addListener(async function(result) {
                    let list = []
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
                        console.log('init list', list)
                        cacheList = await me.setCache(list).catch(err => {
                            console.log(err)
                        })
                        me.list = list
                    }

                });
            }
        },
        created: function() {
            let me = this;

        },
        mounted: function() {
            let me = this;
            me.init()
        },
    };
</script>
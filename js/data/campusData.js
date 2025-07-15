/**
 * @description 包含所有校区特定的数据，如宿舍、食堂等。
 * 同时包含用于校区查询工具的学院专业信息。
 * 使用 export 关键字导出，以便其他模块可以导入和使用。
 */
export const campusData = {
    cangwu: {
        name: "苍梧校区",
        dormitory: {
            title: "苍梧校区宿舍介绍",
            items: {
                'a_dorm': {
                    name: 'A区宿舍 (女生)',
                    image: 'images/苍梧校区/宿舍/A区宿舍.jpg',
                    summary: '主要为女生宿舍，靠近三食堂和浴室，生活便利。',
                    details: [
                        {
                            building: 'A1-A4,A8-A10栋',
                            images: [
                                { src: 'images/苍梧校区/宿舍/A区/A1-A4,A8-A9栋楼/A1-A4,A8-A9宿舍内景.jpg', caption: '宿舍内景（上下铺）' },
                            ],
                            roomType: '四人间',
                            layout: '上下铺',
                            bathroom: '独立卫生间，澡堂在三食堂附近',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '一楼有洗衣房',
                            waterHeater: '部分楼层有',
                            price: '1200元/年',
                            notes: '传统的宿舍结构，空间紧凑但生活气息浓厚。开门使用校卡'
                        },
                        {
                            building: 'A5-A8栋',
                            images: [
                                { src: 'images/苍梧校区/宿舍/A区/A5-A8栋楼/A5-A8栋楼宿舍内景.jpg', caption: '宿舍内景（上床下桌）' },
                            ],
                            roomType: '四人间',
                            layout: '上床下桌',
                            bathroom: '独立卫生间，澡堂在三食堂附近',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '一楼有洗衣房',
                            waterHeater: '部分楼层有',
                            price: '1200元/年',
                            notes: '24年暑假刚装修过，装修后变成上床下桌了，宿舍内环境新颖友好。开门使用校卡'
                        },
                    ]
                },
                'b_dorm': {
                    name: 'B区宿舍 (男生)',
                    image: 'images/苍梧校区/宿舍/B区宿舍.jpg',
                    summary: '主要为男生宿舍，楼栋数量多，覆盖多个学院。',
                    details: [
                        {
                            building: 'B1-B4栋',
                            images: [{ src: 'images/苍梧校区/宿舍/B区/B1-B4/B1-B4宿舍内景.jpg', caption: '宿舍内景（上下铺）' }],
                            roomType: '四人间',
                            layout: '上下铺，床对面一排桌子',
                            bathroom: '三食堂西边',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: 'B5楼下，篮球场南边',
                            waterHeater: '每层楼一个热水机，24H供热水',
                            price: '1200元/年',
                            notes: 'B区是最大的宿舍区之一，楼下有小卖部和活动空间。开门使用单独的门卡。'
                        },
                        {
                            building: 'B5-B6栋',
                            images:
                                [
                                    { src: 'images/苍梧校区/宿舍/B区/B5-B6/B5-B6宿舍内景.jpg', caption: '宿舍内景（上床下桌）' },
                                    { src: 'images/苍梧校区/宿舍/B区/B5-B6/宿舍内详景.jpg', caption: '宿舍内详景' },
                                    { src: 'images/苍梧校区/宿舍/B区/B5-B6/公共卫生间.jpg', caption: '公共卫生间' },
                                    { src: 'images/苍梧校区/宿舍/B区/B5-B6/公共卫生间洗手池.jpg', caption: '公共卫生间洗手池' }
                                ],
                            roomType: '四人间',
                            layout: '上床下桌',
                            bathroom: '公共卫生间，公共浴室在三食堂西边',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: 'B5楼下，篮球场南边',
                            waterHeater: '每层楼一个热水机，24H供热水',
                            price: '1000（3、4人间）',
                            notes: 'B区是最大的宿舍区之一，楼下有小卖部和活动空间。开门使用单独的门卡。'
                        },
                        {
                            building: 'B7-B12栋',
                            images: [{ src: 'images/苍梧校区/宿舍/B区/B7-B12/B7-B12宿舍内景.jpg', caption: '六人间宿舍内景' }],
                            roomType: '六人间',
                            layout: '上下铺',
                            bathroom: '有独立卫生间',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '洗衣房在B5楼下，篮球场南边',
                            waterHeater: '部分楼层有开水',
                            price: '950元/年',
                            notes: 'B区是最大的宿舍区之一，楼下有小卖部和活动空间。开门使用单独的门卡。'
                        },
                    ]
                },
                'd_dorm': {
                    name: 'D区宿舍 (东区)',
                    image: 'images/苍梧校区/宿舍/D区宿舍.jpg',
                    summary: '男女生宿舍都有，四人间独立卫浴，条件优越。',
                    details: [
                        {
                            building: 'D5-6，D9-10栋',
                            images: [{ src: 'images/苍梧校区/宿舍/D区/D5,6,9,10/D5,6,9,10宿舍内景.jpg', caption: '宿舍内景（四人间）' }],
                            roomType: '四人间',
                            layout: '上床下桌',
                            bathroom: '独立卫浴，一楼也有公共澡堂',
                            ac: '有',
                            balcony: '两个宿舍共用一个大阳台',
                            network: '周日至周四24:00断电',
                            laundry: '宿舍楼一楼有公共洗衣房',
                            waterHeater: '宿舍内刷卡可取热水，每层楼有一个饮水机',
                            price: '1500元/年（未免费供应热水，实际按1350元/年收取）',
                            notes: '位于学校东侧，也被称为东区宿舍，靠近东区食堂和四号门，环境安静。'
                        },
                        {
                            building: 'D7-8栋',
                            images: [{ src: 'images/苍梧校区/宿舍/D区/D7-D8栋楼/D7-D8栋楼宿舍内景.jpg', caption: '宿舍内景（三人间）' }],
                            roomType: '三人间',
                            layout: '上床下桌',
                            bathroom: '独立卫浴',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '宿舍楼一楼有洗衣房',
                            waterHeater: '每层楼有热水机',
                            price: '1500元/年',
                            notes: '位于学校东侧，也被称为东区宿舍，靠近东区食堂和四号门，环境安静。'
                        },
                    ]
                }
            }
        },
        canteen: {
            title: "苍梧校区食堂介绍(未完成，内容仅仅是占位用的，未核实，待开发)",
            items: {
                'canteen1': {
                    name: '第一食堂',
                    image: 'images/苍梧校区/食堂/第一食堂.jpg',
                    summary: '位于大学生活动中心旁，上下课必经之路。',
                    details: [
                        {
                            area: '第一食堂',
                            images: [
                                { src: 'images/苍梧校区/食堂/第一食堂/苍梧校区_第一食堂_麻辣香锅.jpg', caption: '麻辣香锅' },
                                { src: 'images/苍梧校区/食堂/第一食堂/苍梧校区_第一食堂_腊汁肉夹馍.jpg', caption: '腊汁肉夹馍' },
                                { src: 'images/苍梧校区/食堂/第一食堂/苍梧校区_第一食堂_鸡蛋拌面.jpg', caption: '鸡蛋拌面' },
                            ],
                            specialty: ['自选快餐', '特色炒饭', '肉夹馍', '包子'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '主打便捷快餐，出餐速度快，是上下课间快速解决吃饭问题的首选。'
                        }
                    ]
                },
                'canteen2': {
                    name: '第二食堂 & 风味餐厅',
                    image: 'images/苍梧校区/食堂/第二食堂.jpg',
                    summary: '位于海洋楼旁，离教学区最近，装修典雅。',
                    details: [
                        {
                            area: '一楼：第二食堂',
                            images: [
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_明炉羊肉.jpg', caption: '明炉羊肉' },
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_虾仁鸡蛋炒面.jpg', caption: '虾仁鸡蛋炒面' },
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_卤汁香肠拌面.jpg', caption: '卤汁香肠拌面' },
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_水煮小酥肉.jpg', caption: '水煮小酥肉' },
                            ],
                            specialty: ['小火锅', '盖浇饭', '川菜', '拌饭'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '离教学楼最近，菜品实惠，是解决日常三餐的主要场所。'
                        },
                        {
                            area: '二楼：风味餐厅',
                            images: [
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_特色米线.jpg', caption: '特色米线' },
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_煎肉拌饭.jpg', caption: '煎肉拌饭' },
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_招牌法式咖喱蛋包饭.jpg', caption: '招牌法式咖喱蛋包饭' },
                                { src: 'images/苍梧校区/食堂/第二食堂&风味餐厅/苍梧校区_第二食堂 & 风味餐厅_淮南牛肉汤.jpg', caption: '淮南牛肉汤' },
                            ],
                            specialty: ['米线', '牛肉汤', '石锅拌饭', '咖喱饭'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '环境优雅，提供各地风味美食，适合改善伙食或朋友小聚。'
                        }
                    ]
                },
                'canteen3': {
                    name: '第三食堂 & 第四食堂',
                    image: 'images/苍梧校区/食堂/第三食堂.jpg',
                    summary: '网红餐厅，种类丰富，最大和豪华的食堂。',
                    details: [
                        {
                            area: '一楼：第三食堂',
                            images: [
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_干锅鸡快.jpg', caption: '干锅鸡快' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_鸡肉铁板饭.jpg', caption: '鸡肉铁板饭' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_5元特价快餐.jpg', caption: '5元特价快餐' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_武汉热干面.jpg', caption: '武汉热干面' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_成都担担面.jpg', caption: '成都担担面' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_回锅肉炒饭.jpg', caption: '回锅肉炒饭' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_南京鸭血粉丝.jpg', caption: '南京鸭血粉丝' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_重庆小面.jpg', caption: '重庆小面' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_汉堡工厂.jpg', caption: '汉堡工厂' },
                            ],
                            specialty: ['5元特价快餐', '校园川菜', '拉面', '武汉热干面'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '学以其超高性价比的5元快餐闻名，是月底的“救星”。'
                        },
                        {
                            area: '二楼：第四食堂',
                            images: [
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_烤盘饭.jpg', caption: '烤盘饭' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_招牌烤肉拌饭.jpg', caption: '招牌烤肉拌饭' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_肥牛麻酱拌面.jpg', caption: '肥牛麻酱拌面' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_冒烤鸭.jpg', caption: '冒烤鸭' },
                                { src: 'images/苍梧校区/食堂/第三食堂&第四食堂/苍梧校区_第三 & 第四食堂_鸡排意面.jpg', caption: '鸡排意面' },
                            ],
                            specialty: ['麻辣烫', '冒烤鸭', '烤肉饭'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '学校的美食中心，选择多样，冒烤鸭尤其好吃。'
                        }
                    ]
                },
                'canteen_east': {
                    name: '东区食堂',
                    image: 'images/苍梧校区/食堂/东区食堂.jpg',
                    summary: 'D区食堂，空间大，座位多。',
                    details: [
                        {
                            area: 'D区食堂',
                            images: [
                                { src: 'images/苍梧校区/食堂/东区食堂/苍梧校区_东区食堂_麻辣香锅.jpg', caption: '麻辣香锅' },
                                { src: 'images/苍梧校区/食堂/东区食堂/苍梧校区_东区食堂_石锅菜.jpg', caption: '石锅菜' },
                                { src: 'images/苍梧校区/食堂/东区食堂/苍梧校区_东区食堂_鸡肉拌面.jpg', caption: '鸡肉拌面' },
                                { src: 'images/苍梧校区/食堂/东区食堂/苍梧校区_东区食堂_烤肉饭.jpg', caption: '烤肉饭' },
                                { src: 'images/苍梧校区/食堂/东区食堂/苍梧校区_东区食堂_牛肉汤水饺.jpg', caption: '牛肉汤水饺' },
                                { src: 'images/苍梧校区/食堂/东区食堂/苍梧校区_东区食堂_快餐.jpg', caption: '快餐' },
                            ],
                            specialty: ['大众快餐', '面食窗口', '水饺', '香锅'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '空间宽敞明亮，座位充足，不用担心饭点找不到位置。服务D区及附近师生。'
                        }
                    ]
                },
                'canteen_ethnic': {
                    name: '民族餐厅',
                    image: 'images/苍梧校区/食堂/民族餐厅.jpg',
                    summary: '位于医务室旁，清真食堂。',
                    details: [
                        {
                            area: '清真美食',
                            images: [
                                { src: 'images/苍梧校区/食堂/民族餐厅/苍梧校区_民族餐厅_特色风味面.jpg', caption: '特色风味面' },
                                { src: 'images/苍梧校区/食堂/民族餐厅/苍梧校区_民族餐厅_龙虾牛肉面.jpg', caption: '龙虾牛肉面' },
                                { src: 'images/苍梧校区/食堂/民族餐厅/苍梧校区_民族餐厅_精品快餐.jpg', caption: '精品快餐' },
                                { src: 'images/苍梧校区/食堂/民族餐厅/苍梧校区_民族餐厅_清真涮煮.jpg', caption: '清真涮煮' },
                                { src: 'images/苍梧校区/食堂/民族餐厅/苍梧校区_民族餐厅_营养早餐.jpg', caption: '营养早餐' },
                            ],
                            specialty: ['清真涮煮', '风味面', '炒面', '特色早餐'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '严格的清真食堂，为有需要的同学提供地道的民族风味美食，早餐的饼类尤其受欢迎。'
                        }
                    ]
                },
                'canteen_south': {
                    name: '南园餐厅',
                    image: 'images/苍梧校区/食堂/南园餐厅.jpg',
                    summary: '位于文予楼旁，特色是宴席。',
                    details: [
                        {
                            area: '海洋餐厅',
                            images: [
                                { src: 'images/苍梧校区/食堂/南园餐厅/苍梧校区_南园餐厅_隆江猪脚饭.jpg', caption: '隆江猪脚饭' },
                                { src: 'images/苍梧校区/食堂/南园餐厅/苍梧校区_南园餐厅_番茄鸡蛋.jpg', caption: '番茄鸡蛋' },
                                { src: 'images/苍梧校区/食堂/南园餐厅/苍梧校区_南园餐厅_小炒.jpg', caption: '小炒' },

                            ],

                            specialty: ['家常炒菜', '隆江猪脚饭', '小炒'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '更像是校内的社会餐厅，提供点菜服务和包间，适合班级聚餐、生日宴请等活动。'
                        }
                    ]
                }
            }
        }
    },
    tongguan: {
        name: "通灌校区",
        dormitory: {
            title: "通灌校区宿舍介绍",
            items: {
                'jinxiu_dorm': {
                    name: '锦绣宿舍',
                    image: 'images/通灌校区/宿舍/锦绣宿舍.jpg',
                    summary: '通灌校区主要学生宿舍区。',
                    details: [
                        {
                            building: '锦绣1,2,5号楼',
                            images: [
                                { src: 'images/通灌校区/宿舍/锦绣1,2,5号楼/锦绣1,2,5号楼宿舍内景.jpg', caption: '宿舍内景（上下铺）' },
                            ],
                            roomType: '四人间',
                            layout: '上下铺',
                            bathroom: '无独立卫生间，每层楼有隔间式厕所，有人定期打扫。澡堂在前程餐厅旁',
                            ac: '有',
                            balcony: '无',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '部分楼层有公共洗衣机',
                            waterHeater: '部分楼层有开水炉',
                            price: '900元/年',
                            notes: '部分水泥地部分有地砖，桌子上面有柜子可以放东西，宿舍还有大柜子，每个宿舍都有一套打扫工具，每层楼都有大的洗漱台，宿舍开门使用钥匙'
                        },
                        {
                            building: '锦绣3，4，8号楼',
                            images: [{ src: 'images/通灌校区/宿舍/锦绣3,4,8号楼/宿舍内情况.jpg', caption: '宿舍内景' }],
                            roomType: '四人间（少量双人间）',
                            layout: '上下铺',
                            bathroom: '有独立卫生间，澡堂在前程餐厅旁',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '有',
                            waterHeater: '双数楼层有热水机',
                            price: '1200元/年',
                            notes: '不仅每间宿舍内有洗漱台 每层楼也安排大洗漱台，开门使用钥匙'
                        },
                        {
                            building: '锦绣6，7号楼',
                            images: [{ src: 'images/通灌校区/宿舍/锦绣6,7号楼/锦绣6,7号楼宿舍内景.jpg', caption: '五人间宿舍内景' }],
                            roomType: '五人间，四个人上下铺，一个人上床下桌',
                            layout: '上床下桌/上下铺',
                            bathroom: '无独立卫生间，请到前程餐厅附近的澡堂洗澡',
                            ac: '有',
                            balcony: '无',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '两层中有一层会有洗衣机',
                            waterHeater: '两层中有一层会有热水炉',
                            price: '700元/年',
                            notes: '部分水泥地部分有地砖，开门使用钥匙。多出来的桌子是上床下桌，比其他桌子大一些'
                        }
                    ]
                }
            }
        },
        canteen: {
            title: "通灌校区食堂介绍",
            items: {
                'qiancheng_canteen': {
                    name: '前程餐厅',
                    image: 'images/通灌校区/食堂/前程餐厅.jpg',
                    summary: '校区主食堂，满足日常用餐需求。',
                    details: [
                        {
                            area: '前程餐厅',
                            images: [
                                { src: 'images/通灌校区/食堂/前程餐厅/通灌校区_前程餐厅_西红柿鸡蛋拌面.jpg', caption: '西红柿鸡蛋拌面' },
                                { src: 'images/通灌校区/食堂/前程餐厅/通灌校区_前程餐厅_招牌鸡腿饭.jpg', caption: '招牌鸡腿饭' },
                                { src: 'images/通灌校区/食堂/前程餐厅/通灌校区_前程餐厅_藤椒鸡柳拌面.jpg', caption: '藤椒鸡柳拌面' },
                            ],
                            specialty: ['版面', '快餐', '水饺', '烤鸭'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '菜品丰富，价格实惠，快餐很棒，窗口很多'
                        }
                    ]
                },
                'food_square': {
                    name: '美食广场',
                    image: 'images/通灌校区/食堂/美食广场.jpg',
                    summary: '汇集多种风味美食，提供多样化选择。',
                    details: [
                        {
                            area: '美食广场',
                            images: [
                                { src: 'images/通灌校区/食堂/美食广场/通灌校区_美食广场_中式快餐.jpg', caption: '中式快餐' },
                                { src: 'images/通灌校区/食堂/美食广场/通灌校区_美食广场_麻辣烫香锅.jpg', caption: '麻辣烫香锅' },
                                { src: 'images/通灌校区/食堂/美食广场/通灌校区_美食广场_小碗牛肉面.jpg', caption: '小碗牛肉面' },
                            ],
                            specialty: ['中式快餐', '鸡肉饭', '拌面', '香锅'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '年轻人喜爱的地方，营业时间长，适合休闲和夜宵。'
                        }
                    ]
                },
                '民族风味餐厅': {
                    name: '民族风味餐厅',
                    image: 'images/通灌校区/食堂/民族风味餐厅.jpg',
                    summary: '汇集多种风味美食，提供多样化选择。',
                    details: [
                        {
                            area: '民族风味餐厅',
                            images: [
                                { src: 'images/通灌校区/食堂/民族风味餐厅/通灌校区_民族风味餐厅_番茄鸡排饭.jpg', caption: '番茄鸡排饭' },
                                { src: 'images/通灌校区/食堂/民族风味餐厅/通灌校区_民族风味餐厅_酸菜牛肉炒饭.jpg', caption: '酸菜牛肉炒饭' },
                                { src: 'images/通灌校区/食堂/民族风味餐厅/通灌校区_民族风味餐厅_鸡排烤冷面.jpg', caption: '鸡排烤冷面' }
                            ],
                            specialty: ['黄焖鸡', '粉丝', '鸡排饭',],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '年轻人喜爱的地方，营业时间长，适合休闲和夜宵。'
                        }
                    ]
                }
            }
        }
    },
    songtiao: {
        name: "宋跳校区",
        dormitory: {
            title: "宋跳校区宿舍介绍",
            items: {
                'songtiao_dorm': {
                    name: '宋跳校区宿舍',
                    image: 'images/宋跳校区/宿舍/宋跳宿舍.jpg',
                    summary: '宋跳校区学生生活区。',
                    details: [
                        {
                            building: '1，2号楼',
                            images: [
                                { src: 'images/宋跳校区/宿舍/1,2号楼/1,2号楼宿舍内景.jpg', caption: '四人间（上床下桌）' },
                            ],
                            roomType: '四人间',
                            layout: '上床下桌',
                            bathroom: '无独立卫生间，楼内有公共卫生间。大澡堂洗澡',
                            ac: '有',
                            balcony: '无',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '阳台可自行安装洗衣机',
                            waterHeater: '宿舍内独立热水器',
                            price: '1000元/年',
                            notes: '宿舍条件较好，均为标准四人间配置，生活舒适。新改造的卫生间有自洁功能'
                        },
                        {
                            building: '3，6号楼(六人间)',
                            images: [{ src: 'images/宋跳校区/宿舍/3,6号楼/3,6号楼宿舍内景.jpg', caption: '六人间宿舍内景' }],
                            roomType: '六人间',
                            layout: '上下铺',
                            bathroom: '有独立卫生间，有公共卫生间，大澡堂洗澡',
                            ac: '有',
                            balcony: '未知',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '有',
                            waterHeater: '未知',
                            price: '1000元/年',
                            notes: '宿舍条件较好，均为标准六人间配置，生活舒适。'
                        },
                        {
                            building: '6号楼(四人间)，7，8号楼',
                            images: [{ src: 'images/宋跳校区/宿舍/6,7,8号楼/6,7,8号楼宿舍内景.jpg', caption: '宽敞的四人间宿舍' }],
                            roomType: '四人间',
                            layout: '上床下桌',
                            bathroom: '有独立卫生间和公共卫生间，大澡堂洗澡',
                            ac: '有',
                            balcony: '有',
                            network: '周日至周四24:00断网，周五周六不断网',
                            laundry: '未知',
                            waterHeater: '未知',
                            price: '1200元/年',
                            notes: '宿舍条件较好，均为标准四人间配置，生活舒适。宿舍空间大。'
                        }
                    ]
                }
            }
        },
        canteen: {
            title: "宋跳校区食堂介绍",
            items: {
                'donggang_canteen': {
                    name: '东港餐厅',
                    image: 'images/宋跳校区/食堂/东港餐厅.jpg',
                    summary: '校区内唯一的学生食堂。',
                    details: [
                        {
                            area: '综合食堂',
                            images: [
                                { src: 'images/宋跳校区/食堂/东港餐厅/宋跳校区_东港餐厅_兰州拉面.jpg', caption: '兰州拉面' },
                                { src: 'images/宋跳校区/食堂/东港餐厅/宋跳校区_东港餐厅_新疆炒米粉.jpg', caption: '新疆炒米粉' },
                                { src: 'images/宋跳校区/食堂/东港餐厅/宋跳校区_东港餐厅_中式快餐.jpg', caption: '中式快餐' },
                                { src: 'images/宋跳校区/食堂/东港餐厅/宋跳校区_东港餐厅_川味小炒.jpg', caption: '川味小炒' },
                            ],
                            specialty: ['新疆炒米粉', '兰州拉面', '盖浇饭', '川味小炒'],
                            priceRange: '待补充',
                            openingHours: '待补充',
                            notes: '虽然选择不如主校区多，但能满足日常基本用餐需求，口味不错。'
                        }
                    ]
                }
            }
        }
    }
};

export const campusInfoData = {
    "苍梧校区": [
        { college: "海洋科学与水产学院", majors: ["海洋资源与环境", "海洋科学", "生物技术", "水产养殖学"] },
        { college: "电子工程学院", majors: ["电子信息工程", "通信工程", "自动化", "电气工程及其自动化"] },
        { college: "环境与化学工程学院", majors: ["环境工程", "化学工程与工艺", "高分子材料与工程", "安全工程"] },
        { college: "计算机工程学院", majors: ["计算机科学与技术", "软件工程", "数据科学与大数据技术", "网络工程"] },
        { college: "药学院", majors: ["制药工程", "药物制剂", "药物分析"] },
        { college: "体育学院", majors: ["休闲体育"] },
        { college: "马可夫洛夫海洋工程学院", majors: ["机器人工程", "船舶与海洋工程"] }
    ],
    "通灌校区": [
        { college: "海洋食品与生物工程学", majors: ["食品科学与工程", "生物工程"] },
        { college: "海洋工程学院", majors: ["船舶与海洋工程", "海洋资源开发技术"] },
        { college: "机械工程学院", majors: ["机械设计制造及其自动化", "机械电子工程", "机器人工程"] },
        { college: "土木与港海工程学院", majors: ["土木工程", "建筑学", "港口航道与海岸工程", "工程管理"] },
        { college: "海洋技术与测绘学院", majors: ["测绘工程", "海洋技术", "地理信息科学", "遥感科学与技术"] },
        { college: "理学院", majors: ["信息与计算科学", "光电信息科学与工程", "新能源科学与工程", "数学与应用数学"] },
        { college: "商学院", majors: ["金融学", "国际经济与贸易", "工商管理", "会计学", "财务管理", "物流管理"] },
        { college: "文法学院", majors: ["汉语言文学", "新闻学", "法学", "行政管理"] },
        { college: "外国语学院", majors: ["英语", "日语", "俄语"] },
        { college: "艺术设计学院", majors: ["视觉传达设计", "环境设计", "产品设计", "数字媒体艺术"] }
    ]
};

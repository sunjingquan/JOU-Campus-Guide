/**
 * @description 包含所有通用的、非校区特定的指南数据。
 * 使用 export 关键字导出，以便其他模块可以导入和使用。
 */
export const guideData = {
    "主页": {
        icon: "home",
        isHomePage: true,
        pages: {
            "home": {
                title: "欢迎来到江苏海洋大学", content: `
                                <div class="flex flex-col justify-center items-center h-full">
                                    <div class="hero-bg text-white p-12 rounded-2xl text-center flex flex-col items-center justify-center shadow-xl mb-12">
                                        <h1 class="text-5xl font-extrabold mb-4 drop-shadow-lg">开启你的大学新篇章</h1>
                                        <p class="text-lg max-w-2xl mb-8 drop-shadow-md">本指南将帮助你快速熟悉校园生活，解决入学遇到的各种问题。准备好了吗？</p>
                                        <button id="explore-btn" class="bg-white text-blue-800 font-bold py-3 px-8 rounded-full text-lg hover:bg-blue-100 transform hover:scale-105 transition-all duration-300 shadow-lg">开始探索</button>
                                    </div>
                                    <div>
                                        <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">快速导航</h2>
                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <a href="#" data-navlink='{"category": "入学准备", "page": "新生入学流程"}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-2xl dark:hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
                                                <div class="bg-blue-100 text-blue-600 p-4 rounded-full mb-4"><i data-lucide="list-checks" class="w-8 h-8"></i></div>
                                                <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">入学流程</h3>
                                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">报到注册步骤全解析</p>
                                            </a>
                                            <a href="#" data-navlink='{"category": "校园生活", "page": "宿舍介绍"}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-2xl dark:hover:shadow-green-500/20 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
                                                <div class="bg-green-100 text-green-600 p-4 rounded-full mb-4"><i data-lucide="bed-double" class="w-8 h-8"></i></div>
                                                <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">宿舍介绍</h3>
                                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">了解你的新家</p>
                                            </a>
                                            <a href="#" data-navlink='{"category": "学习科研", "page": "关于绩点和学分"}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl dark:hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
                                                <div class="bg-purple-100 text-purple-600 p-4 rounded-full mb-4"><i data-lucide="graduation-cap" class="w-8 h-8"></i></div>
                                                <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">学业发展</h3>
                                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">绩点、转专业、竞赛</p>
                                            </a>
                                            <a href="#" data-navlink='{"category": "答疑与支持", "page": "常见问题汇总"}' class="nav-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-2xl dark:hover:shadow-red-500/20 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center">
                                                <div class="bg-red-100 text-red-600 p-4 rounded-full mb-4"><i data-lucide="help-circle" class="w-8 h-8"></i></div>
                                                <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100">常见问题</h3>
                                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">新生疑惑解答</p>
                                            </a>
                                        </div>
                                    </div>
                                </div>`
            }
        }
    },
    "入学准备": {
        icon: "package-check",
        pages: {
            "大一校区查询": {
                title: "大一校区查询",
                type: "campus-query-tool",
                content: ``
            },
            "开学必备清单": {
                title: "开学必备清单", content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
<div class="p-6 rounded-xl w-full">
<h3 class="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-6 border-l-4 border-blue-700 dark:border-blue-500 pl-4">证件及文件类 (最重要！)</h3>
<ul class="list-none space-y-4 text-gray-700 dark:text-gray-300">
    <li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>录取通知书、高考准考证、身份证：</strong>最重要的身份证明，务必随身携带，妥善保管。</div></li>
    <li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>身份证复印件：</strong>正反面复印在同一张A4纸上，建议准备3-4份，部分手续需要。</div></li>
    <li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>户口本本人页复印件：</strong>申请助学金或办理户口迁移时可能需要。</div></li>
    <li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>一寸/两寸证件照：</strong>红蓝白底各准备一版（约8-16张），用于办理学生证、体检、社团申请等。</div></li>
    <li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>党/团组织关系材料：</strong>团员证及相关档案，按学校要求办理转接手续。</div></li>
    <li class="flex items-start"><i data-lucide="check-circle-2" class="text-green-500 w-5 h-5 mr-3 mt-1 flex-shrink-0"></i><div><strong>学生档案：</strong>部分地区需要学生自带，请确认清楚并妥善保管，切勿私自拆封！</div></li>
</ul>
</div>

<div class="grid md:grid-cols-2 gap-x-8 mt-8">
<div class="p-6 rounded-xl w-full">
    <h3 class="text-2xl font-bold text-green-800 dark:text-green-400 mb-6 border-l-4 border-green-700 dark:border-green-500 pl-4">床上用品</h3>
    <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>床垫、被子、枕头</li>
        <li>床单、被套、枕套（三件套）</li>
        <li>蚊帐、床帘（提高私密性）</li>
    </ul>
</div>

<div class="p-6 rounded-xl w-full">
    <h3 class="text-2xl font-bold text-cyan-800 dark:text-cyan-400 mb-6 border-l-4 border-cyan-700 dark:border-cyan-500 pl-4">洗漱用品</h3>
    <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>牙刷、牙膏、漱口杯</li>
        <li>毛巾、浴巾</li>
        <li>洗发水、沐浴露、洗面奶</li>
        <li>脸盆、水桶</li>
        <li>洗衣液、肥皂、皂盒</li>
    </ul>
</div>

<div class="p-6 rounded-xl w-full mt-4">
    <h3 class="text-2xl font-bold text-purple-800 dark:text-purple-400 mb-6 border-l-4 border-purple-700 dark:border-purple-500 pl-4">衣物鞋袜</h3>
    <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>根据连云港气候准备四季衣物</li>
        <li>睡衣、居家服</li>
        <li>拖鞋、运动鞋、日常穿着的鞋</li>
        <li>袜子、内衣裤（多备几套）</li>
        <li>衣架、裤架、收纳袋</li>
    </ul>
</div>

<div class="p-6 rounded-xl w-full mt-4">
    <h3 class="text-2xl font-bold text-orange-800 dark:text-orange-400 mb-6 border-l-4 border-orange-700 dark:border-orange-500 pl-4">电子产品及其它</h3>
    <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
        <li>手机、充电器、充电宝</li>
        <li>笔记本电脑、鼠标、U盘</li>
        <li>耳机、数据线</li>
        <li>台灯、可用于床头的夹灯</li>
        <li>带有多孔位的插排</li>
        <li>少量现金以备不时之需</li>
    </ul>
</div>
</div>

<div class="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-6 rounded-lg w-full mt-10" role="alert">
<div class="flex">
    <div class="py-1"><i data-lucide="alert-triangle" class="w-6 h-6 text-yellow-600 mr-4 flex-shrink-0"></i></div>
    <div>
        <p class="font-bold">温馨提示</p>
        <ul class="list-disc list-inside mt-2 text-sm">
            <li>大件物品如被褥、床垫等，若路途遥远，建议到校后购买或提前邮寄至学校，以减轻行李负担。</li>
            <li>电脑等贵重电子产品，建议到校安顿好后再购买或由家人寄送。</li>
            <li>可以准备一些个人常用药品，如感冒药、创可贴、肠胃药等。</li>
        </ul>
    </div>
</div>
</div>
</div>` },
            "新生入学流程": {
                title: "新生入学流程",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="relative border-l-4 border-blue-500 pl-10 space-y-16 py-6 w-full"><div class="absolute w-4 h-4 bg-blue-600 rounded-full -left-2 top-6 ring-8 ring-white dark:ring-gray-800"></div><div class="relative"><h3 class="text-xl font-bold text-blue-800 dark:text-blue-400">第一步：报到注册</h3><p class="text-gray-600 dark:text-gray-300 mt-2">在指定日期（通常在9月4号到8号，每年不固定），在红马甲志愿者（都是学长学姐门）的引导下，前往所在学院的迎新点->找到自己对应的班级->在有电脑的地方刷身份证进行登记->找到坐在帐篷里的班助->提交身份证复印件+录取通知书原件并登记面前的登记表->领取①校园手提袋②海大蓝T恤③军训服装领取卡④入学体检单⑤学生手册⑥宿舍床上用品领取单（选购）等材料。班助，辅导员和迎新学长学姐会在此等候。</p></div><div class="absolute w-4 h-4 bg-blue-600 rounded-full -left-2" style="top: 33.33%"></div><div class="relative"><h3 class="text-xl font-bold text-blue-800 dark:text-blue-400">第二步：入住寝室</h3><p class="text-gray-600 dark:text-gray-300 mt-2">在负责运送行李的红马甲志愿者的带领下前往自己的宿舍楼和房间，在宿管阿姨处办理入住手续，注册完美校园，领取房卡（部分地区用校园卡就可以刷开门）。整理个人物品，打扫卫生，与新室友见面，熟悉环境。</p></div><div class="absolute w-4 h-4 bg-blue-600 rounded-full -left-2" style="top: 66.66%"></div><div class="relative"><h3 class="text-xl font-bold text-blue-800 dark:text-blue-400">第三步：办理各项手续</h3><p class="text-gray-600 dark:text-gray-300 mt-2">缴纳学费、住宿费（请关注江苏海洋大学财务平台微信公众号）；根据需要办理户口迁移；参加学校统一组织的入学体检，会在报道的第二天开始进行，通常在第二人民医院，在集合点坐车去。</p></div><div class="absolute w-4 h-4 bg-blue-600 rounded-full -left-2 bottom-6 ring-8 ring-white dark:ring-gray-800"></div><div class="relative"><h3 class="text-xl font-bold text-blue-800 dark:text-blue-400">第四步：开启新生活</h3><p class="text-gray-600 dark:text-gray-300 mt-2">参加开学典礼、军训动员大会、班级会议。之后将开始军训和正式的课程学习，正式开启大学生活！</p></div></div></div>`
            },
            "开学须知": {
                title: "开学须知",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="space-y-6"><div class="border-b dark:border-gray-700 pb-4"><h4 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center"><i data-lucide="calendar-days" class="text-indigo-500 mr-3"></i>报到时间与地点</h4><p class="text-gray-600 dark:text-gray-300 mt-2 pl-8">请严格按照录取通知书上的时间和地点报到，不要过早或过晚。如有特殊情况（如因病、交通问题等）无法按时报到，务必提前联系班助、学院辅导员说明情况，办理请假手续。</p></div><div class="border-b dark:border-gray-700 pb-4"><h4 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center"><i data-lucide="shield-check" class="text-red-500 mr-3"></i>安全问题</h4><p class="text-gray-600 dark:text-gray-300 mt-2 pl-8">注意人身和财产安全，保管好个人贵重物品。警惕陌生人的过度热情和推销，特别是上门推销电话卡、文具等。不要轻易相信任何要求转账汇款的信息，谨防电信诈骗和校园贷陷阱。</p></div><div><h4 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center"><i data-lucide="file-archive" class="text-yellow-500 mr-3"></i>档案转移</h4><p class="text-gray-600 dark:text-gray-300 mt-2 pl-8">确认自己的党/团组织关系和学生档案是否已按要求转至学校。自带档案的同学，报到后应立即将档案上交至指定部门，切勿私自拆封。</p></div></div></div>`
            },
            "军训攻略": {
                title: "军训攻略",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-6xl mx-auto"><div class="grid md:grid-cols-2 gap-8"><div class="p-6 rounded-xl"><h3 class="text-2xl font-bold text-teal-800 dark:text-teal-400 mb-6 border-l-4 border-teal-700 dark:border-teal-500 pl-4">军训攻略</h3><ul class="list-disc list-inside space-y-3 text-gray-700 dark:text-gray-300"><li><strong>待开发</strong></li></ul></div></div></div>`
            }
        }
    },
    "校园生活": {
        icon: "utensils-crossed",
        pages: {
            "食堂介绍": { title: "食堂介绍", isCampusSpecific: true },
            "宿舍介绍": { title: "宿舍介绍", isCampusSpecific: true },
            "校园超市与共享单车": {
                title: "校园超市与共享单车",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="p-6 rounded-xl w-full"><h3 class="text-2xl font-bold text-purple-800 dark:text-purple-400 mb-4 border-l-4 border-purple-700 dark:border-purple-500 pl-4">校园超市</h3><p class="text-gray-700 dark:text-gray-300">校内设有多个超市，苍梧校区在三食堂旁、顺丰快递旁有超市。支持使用校园卡、微信、支付宝等多种支付方式。</p></div><div class="p-6 rounded-xl w-full mt-8"><h3 class="text-2xl font-bold text-sky-800 dark:text-sky-400 mb-4 border-l-4 border-sky-700 dark:border-sky-500 pl-4">校园共享单车</h3><p class="text-gray-700 dark:text-gray-300">由于校园面积较大，各功能区之间有一定距离，共享单车是校内非常便捷的代步工具。校园内有7MA”小蓝车“，用微信扫码即可开锁使用。请大家注意遵守交通规则，并将车辆停放在指定的划线区域内，共同维护校园环境。</p></div></div>`
            },
            "社团与组织": {
                title: "社团与组织",
                type: "clubs",
                data: {
                    introduction: "大学生活不只有学习，丰富多彩的社团活动是结交朋友、培养兴趣、提升能力的重要平台。我校拥有上百个学生社团，百花齐放。每年开学季，学校都会举办盛大的“百团大战”社团招新活动，届时所有社团都会集中展示自己，是了解和加入社团的最佳时机！",
                    clubs: [
                        {
                            level: 5,
                            label: "五星级社团",
                            icon: "star",
                            color: "text-yellow-400",
                            list: ["大学生科技协会", "青年志愿者协会", "大学生艺术团", "生命-海洋协会", "“淮海之声”广播站", "大学生书画协会", "艺馨艺术团", "大学生通讯社", "大学生创新创业协会"]
                        },
                        {
                            level: 4,
                            label: "四星级社团",
                            icon: "award",
                            color: "text-slate-400",
                            list: ["绿色能源协会", "琢闻编校社", "大学生读者之友协会", "淮海思源社", "大学生飞镖协会", "淮海棋社", "演讲与口才协会", "白桦俄语社", "大学生就业服务协会"]
                        },
                        {
                            level: 3,
                            label: "三星级社团",
                            icon: "medal",
                            color: "text-orange-400",
                            list: ["小企鹅海洋保护协会", "大学生“三农”协会", "大学生法律之友协会", "大学生英语沙龙协会", "韩屋村", "青年学习社", "大学生燎原学社", "国贸协会", "翻译工作者协会", "大学生模拟联合国大会协会", "金融协会", "天文探索者协会", "中医药协会", "海航社", "阳光手语社", "大学生乒乓球协会", "羽毛球协会", "未央话剧社", "Boom DayBreak街舞社", "GTR动漫社", "国风社", "樱花社", "民族之汇", "纵横辩论社", "大学生心理协会", "未来管理者协会", "企业模拟运营协会", "风暴足球联盟", "大学生排球协会"]
                        },
                        {
                            level: 2,
                            label: "二星级社团",
                            icon: "gem",
                            color: "text-cyan-400",
                            list: ["八一军旅社", "IDV剧社", "Relax Cosplay 动漫协会", "无人机协会", "食安社", "大学生物流协会", "水族协会", "文源社", "大学生中华传统武术协会", "电子竞技社团", "大学生健身健美协会"]
                        },
                        {
                            level: 1,
                            label: "一星级社团",
                            icon: "sparkle",
                            color: "text-green-400",
                            list: ["会计协会", "DIY手艺社", "ALLAN推理社", "大学生台球协会", "M.E街舞艺术团", "T.O轮滑协会"]
                        }
                    ],
                    organizations: {
                        title: "团学组织",
                        content: "团学组织是学生自我管理、自我服务、自我教育的重要载体，主要包括校级和院级的<strong>学生会各部门和团委</strong>等。加入这些组织，不仅可以锻炼自己的组织协调、沟通表达、活动策划等多方面能力，还能更深入地参与到学校和学院的管理服务工作中，为同学们发声，为校园建设贡献力量。团学组织的招新信息通常会在开学后通过官方公众号、班级群等渠道发布，有意向的同学可以多多关注。"
                    }
                }
            }
        }
    },
    "学习科研": {
        icon: "graduation-cap",
        pages: {
            "关于绩点和学分": {
                title: "关于绩点和学分",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="space-y-8"><div><h4 class="font-bold text-2xl text-gray-800 dark:text-gray-100 flex items-center mb-4"><i data-lucide="star" class="text-yellow-500 mr-3"></i>学分 (Credit)</h4><p class="text-gray-600 dark:text-gray-300 text-lg">学分是衡量你学习量的单位。每门课程都有固定的学分，例如“高等数学”可能是4个学分，“大学体育”可能是1个学分。你必须在大学期间修满培养方案规定的<strong>总学分</strong>和<strong>各类课程（如必修课、选修课）的最低学分要求</strong>，才能顺利毕业。所以，请务必认真对待每一门课程。</p></div><div class="border-t my-6 dark:border-gray-700"></div><div><h4 class="font-bold text-2xl text-gray-800 dark:text-gray-100 flex items-center mb-4"><i data-lucide="trending-up" class="text-green-500 mr-3"></i>绩点 (GPA)</h4><p class="text-gray-600 dark:text-gray-300 text-lg">绩点（Grade Point Average）是衡量你学习质量的核心指标，它由你的课程成绩按照特定公式换算而来（通常分数越高，绩点越高）。绩点非常重要，它直接影响到你的<strong>奖学金评定、评优评先</strong>等方方面面。一个高的绩点是你大学学习成果的最直观体现，请从大一开始就努力保持良好的成绩！</p></div></div></div>`
            },
            "关于转专业": {
                title: "关于转专业",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">转专业政策简介</h3><p class="text-gray-600 dark:text-gray-300">学校为给学生提供更多自主选择和发展的机会，设立了转专业制度。通常在大一学年结束后，符合条件的学生可以申请转入其他专业学习。具体政策请关注教务处通知。</p></div>`
            },
            "竞赛与证书": {
                title: "竞赛与证书",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">积极参与，提升自我</h3><p class="text-gray-600 dark:text-gray-300 mb-6">参加学科竞赛和考取有含金量的证书是提升个人综合能力、增加未来竞争力的重要途径。</p></div>`
            }
        }
    },
    "数字化校园": {
        icon: "smartphone",
        pages: {
            "校园卡与APP": {
                title: "校园卡与完美校园APP",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">校园一卡通与APP</h3><p class="text-gray-600 dark:text-gray-300">校园卡是校内身份识别和消费的重要凭证。配合“完美校园”APP可以进行充值、查询消费记录、缴纳网费电费等。</p></div>`
            },
            "宽带与电费": {
                title: "宿舍宽带与电费缴纳",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><div class="w-full"><h3 class="text-2xl font-bold text-cyan-800 dark:text-cyan-400 mb-6 border-l-4 border-cyan-700 dark:border-cyan-500 pl-4">宿舍宽带使用教程</h3><p class="text-gray-700 dark:text-gray-300 mb-4">宿舍上网需要自行办理。一般流程如下：</p><ol class="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400"><li><strong>选择运营商：</strong>开学时，中国移动、联通、电信三大运营商都会在校内设点，提供不同价格和速率的校园套餐，可根据需求自行选择。</li><li><strong>连接与认证：</strong>将网线连接到宿舍墙上的网络端口和你的电脑（或路由器）连接并拨号。以Win11系统举例，拨号界面在设置->网络和Internet->拨号，第一次使用时候设置新连接，移动的账号是学号@cmcc，电信是学号@telecom，联通是学号@unicom，密码都为身份证后八位。</li></ol></div><div class="w-full mt-8"><h3 class="text-2xl font-bold text-amber-800 dark:text-amber-400 mb-6 border-l-4 border-amber-700 dark:border-amber-500 pl-4">电费查询及缴纳</h3><p class="text-gray-700 dark:text-gray-300">请关注”江苏海洋大学微后勤”微信公众号，可以查询宿舍的电费信息并缴纳电费。每个宿舍每学期有少量免费用电额度。</p></div></div>`
            },
            "WebVPN系统": {
                title: "江苏海洋大学WebVPN系统",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">什么是WebVPN？</h3><p class="text-gray-600 dark:text-gray-300">WebVPN是一个神奇的工具，它能让你在校外也能像在校园网内一样，访问学校内部的各种网络资源，如图书馆数据库、教务系统等。</p><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">我该如何使用WebVPN</h3> WebVPN网站：http://webvpn.jou.edu.cn:58888/login ，账号是学号，密码默认是身份证后8位，登陆后点击“统一门户”，在校需要的功能基本上都能在里面找到。</div>`
            }
        }
    },
    "答疑与支持": {
        icon: "life-buoy",
        pages: {
            "常见问题汇总": {
                title: "常见问题汇总 (FAQ)", type: "faq", items: [
                    { q: "学校的快递点在哪里？怎么收发快递？", a: "校内设有菜鸟驿站。你的快递会被送到驿站，凭取件码即可领取。寄快递也可以在驿站操作，非常方便。" },
                    { q: "生病了要去哪里看病？医保怎么用？", a: "校内设有校医院，可以处理常见的头疼感冒、小外伤等。凭校园卡挂号看病，可享受学生医保报销。如果病情较重，校医院医生会建议并协助转诊至校外的大型医院。" },
                    { q: "如何查询课程表和成绩？", a: "可以通过学校的教务系统网站查询个人课程表、考试安排和各科成绩。" },
                    { q: "校园网经常掉线或者速度慢怎么办？", a: "首先可以尝试重启路由器或电脑。如果问题依然存在，可以联系你所办理的运营商客服报修。" }
                ]
            },
            "重要部门联系方式": {
                title: "重要部门联系方式",
                content: `<div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto"><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">学校官网链接：</h3><div class="overflow-x-auto"><table class="w-full text-left"><thead><p style="color: rgb(0, 0, 255);"><a href="https://www.jou.edu.cn/bgdhcx.htm">https://www.jou.edu.cn/bgdhcx.htm</a></p>`
            }
        }
    }
};

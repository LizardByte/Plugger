// load external js scripts
$.getScript('https://app.lizardbyte.dev/js/levenshtein_distance.js')
$.getScript('https://app.lizardbyte.dev/js/ranking_sorter.js')


$(document).ready(function(){
    // Set cache = false for all jquery ajax requests.
    $.ajaxSetup({
        cache: false,
    })
})

let installed_plugins = null
let plugger_plugins = null
let all_plugins = []

let plugins_container = document.getElementById("plugins-container")

$(document).ready(function(){
    // get installed plugins
    // json data with key being the plugin_identifier
    $.ajax({
        async: false,
        url: "/installed_plugins",
        type: "GET",
        dataType: "json",
        success: function (result) {
            installed_plugins = result
        }
    })

    // get PluggerDB plugins
    // json data with key being the GitHub repo id
    // will need to match the name property name or bundle property of the installed plugin data
    $.ajax({
        async: false,
        url: "https://app.lizardbyte.dev/PluggerDB/plugins.json",
        type: "GET",
        dataType: "json",
        success: function (result) {
            plugger_plugins = result
        }
    })

    // set all plugins installed state to false
    for (let plugger_plugin in plugger_plugins) {
        plugger_plugins[plugger_plugin]['installed'] = false
        plugger_plugins[plugger_plugin]['installed_data'] = null
    }

    // combine the two dictionaries
    for (let installed_plugin in installed_plugins) {
        let plugin_name = installed_plugins[installed_plugin]['name']
        let plugin_bundle = installed_plugins[installed_plugin]['bundle']

        let found = false

        // if not system plugin
        if (installed_plugins[installed_plugin]['type'] !== 'system') {
            // try to find the plugin in PluggerDB
            for (let plugger_plugin in plugger_plugins) {
                if (plugger_plugins[plugger_plugin]['name'] === plugin_name || plugger_plugins[plugger_plugin]['name'] === plugin_bundle) {
                    // found it
                    found = true
                    plugger_plugins[plugger_plugin]['installed'] = true
                    plugger_plugins[plugger_plugin]['installed_data'] = installed_plugins[installed_plugin]
                    break
                }
            }
        }

        // if not found, these are system or user installed plugins
        if (found === false) {
            // add it to PluggerDB
            plugger_plugins[installed_plugin] = {
                "name": plugin_name,
                "full_name": plugin_name,
                "description": installed_plugins[installed_plugin]['description'],
                "installed": true,
                "installed_data": installed_plugins[installed_plugin]
            }
        }
    }

    // add plugger plugins to all plugins list
    for (let plugger_plugin in plugger_plugins) {
        plugger_plugins[plugger_plugin]['name_lower'] = plugger_plugins[plugger_plugin]['name'].toLowerCase()
        all_plugins.push(plugger_plugins[plugger_plugin])
    }

    // sort the plugins by name
    all_plugins = all_plugins.sort(rankingSorter('name_lower', 'full_name')).reverse()

    // populate the plugins container
    populate_results(all_plugins)
})


let populate_results = function (plugins_list) {
    for (let plugin in plugins_list) {
        let plugin_name = plugins_list[plugin]['name']

        let item_container = document.createElement("div")
        item_container.className = "container mb-5 shadow border-0 bg-dark rounded-0 px-0"
        plugins_container.appendChild(item_container)

        let inner_container = document.createElement("div")
        inner_container.className = "container py-4 px-1"
        item_container.appendChild(inner_container)

        let table_row = document.createElement("div")
        table_row.className = "d-flex g-0 text-white"
        inner_container.appendChild(table_row)

        let thumb = document.createElement("img")
        thumb.className = "d-flex flex-column px-3 rounded-0 mx-auto"
        // if plugin installed
        if (plugins_list[plugin]['installed']) {
            thumb.src = `/thumbnail/${plugins_list[plugin]['installed_data']['bundle_identifier']}`
        }
        else {
            if (plugins_list[plugin]['thumb_image_url']) {
                thumb.src = plugins_list[plugin]['thumb_image_url']
            }
            else if (plugins_list[plugin]['attribution_image_url']) {
                thumb.src = plugins_list[plugin]['attribution_image_url']
            }
            else {
                thumb.src = "/default-thumb.png"
            }
        }
        thumb.alt = ""
        thumb.style.minWidth = '200px';
        thumb.style.maxWidth = '200px';
        thumb.style.maxHeight = '200px';
        thumb.style.width = 'auto';
        thumb.style.height = 'auto';
        thumb.style.objectFit = 'contain';
        thumb.style.objectPosition = 'center top';
        table_row.appendChild(thumb)

        let data_column = document.createElement("div")
        data_column.className = "d-flex flex-column border-white px-3 border-start w-100"
        table_row.appendChild(data_column)

        let text_container = document.createElement("div")
        data_column.appendChild(text_container)

        let item_title = document.createElement("h4")
        item_title.className = "card-title mb-3 fw-bolder ms-0 mx-2"
        item_title.textContent = plugin_name
        text_container.appendChild(item_title)

        let item_summary = document.createElement("p")
        item_summary.className = "card-text ms-0 mx-2"
        item_summary.innerHTML = plugins_list[plugin]['description']
        text_container.appendChild(item_summary)

        let categories_row = document.createElement("div")
        categories_row.className = "row w-100 mt-auto pt-4"
        data_column.appendChild(categories_row)

        let urls_row = document.createElement("div")
        urls_row.className = "row w-100 mt-auto pt-4"
        data_column.appendChild(urls_row)

        // for PluggerDB plugins
        if (plugins_list[plugin]['html_url']) {
            // create a badge for each category
            for (let category in plugins_list[plugin]['categories']) {
                let category_column = document.createElement("div")
                category_column.className = "col-auto align-self-center"
                categories_row.appendChild(category_column)
                let category_badge = document.createElement("span")
                category_badge.className = "badge bg-secondary"
                category_badge.textContent = plugins_list[plugin]['categories'][category]
                category_column.appendChild(category_badge)
            }

            // GitHub url
            let github_column = document.createElement("div")
            github_column.className = "col-auto align-self-center me-1"
            urls_row.appendChild(github_column)
            let github_link = document.createElement("a")
            github_link.className = "nav-link nav-link-sm text-white"
            github_link.href = plugins_list[plugin]['html_url']
            github_link.target = "_blank"
            github_column.appendChild(github_link)
            let github_icon = document.createElement("i")
            github_icon.className = "fa-brands fa-github fa-xl align-middle"
            github_icon.setAttribute('title', 'GitHub')
            github_link.appendChild(github_icon)

            // add homepage if it exists
            if (plugins_list[plugin]['homepage']) {
                if (!compare_urls(plugins_list[plugin]['homepage'], plugins_list[plugin]['html_url'])) {
                    let homepage_column = document.createElement("div")
                    homepage_column.className = "col-auto align-self-center me-1"
                    urls_row.appendChild(homepage_column)
                    let homepage_link = document.createElement("a")
                    homepage_link.className = "nav-link nav-link-sm text-white"
                    homepage_link.href = plugins_list[plugin]['homepage']
                    homepage_link.target = "_blank"
                    homepage_column.appendChild(homepage_link)
                    let homepage_icon = document.createElement("i")
                    homepage_icon.className = "fa-solid fa-globe fa-xl align-middle"
                    homepage_icon.setAttribute('title', 'Homepage')
                    homepage_link.appendChild(homepage_icon)
                }
            }


            // add gh-pages url if it exists
            if (plugins_list[plugin]['gh_pages_url']) {
                if (!compare_urls(plugins_list[plugin]['gh_pages_url'], plugins_list[plugin]['html_url']) &&
                        !compare_urls(plugins_list[plugin]['gh_pages_url'], plugins_list[plugin]['homepage'])) {
                    let gh_pages_column = document.createElement("div")
                    gh_pages_column.className = "col-auto align-self-center me-1"
                    urls_row.appendChild(gh_pages_column)
                    let gh_pages_link = document.createElement("a")
                    gh_pages_link.className = "nav-link nav-link-sm text-white"
                    gh_pages_link.href = plugins_list[plugin]['gh_pages_url']
                    gh_pages_link.target = "_blank"
                    gh_pages_column.appendChild(gh_pages_link)
                    let gh_pages_icon = document.createElement("i")
                    gh_pages_icon.className = "fa-solid fa-file-code fa-xl align-middle"
                    gh_pages_icon.setAttribute('title', 'Website')
                    gh_pages_link.appendChild(gh_pages_icon)
                }
            }

            // add license url if it exists
            if (plugins_list[plugin]['license_url']) {
                let license_column = document.createElement("div")
                license_column.className = "col-auto align-self-center me-1"
                urls_row.appendChild(license_column)
                let license_link = document.createElement("a")
                license_link.className = "nav-link nav-link-sm text-white"
                license_link.href = plugins_list[plugin]['license_url']
                license_link.target = "_blank"
                license_column.appendChild(license_link)
                let license_icon = document.createElement("i")
                license_icon.className = "fa-solid fa-file-contract fa-xl align-middle"
                license_icon.setAttribute('title', 'License')
                license_link.appendChild(license_icon)
            }

            // add wiki
            if (plugins_list[plugin]['has_wiki'] === true) {
                let wiki_column = document.createElement("div")
                wiki_column.className = "col-auto align-self-center me-1"
                urls_row.appendChild(wiki_column)
                let wiki_link = document.createElement("a")
                wiki_link.className = "nav-link nav-link-sm text-white"
                wiki_link.href = `${plugins_list[plugin]['html_url']}/wiki`
                wiki_link.target = "_blank"
                wiki_column.appendChild(wiki_link)
                let wiki_icon = document.createElement("i")
                wiki_icon.className = "fa-solid fa-book fa-xl align-middle"
                wiki_icon.setAttribute('title', 'GitHub Wiki')
                wiki_link.appendChild(wiki_icon)
            }

            // add discussions
            if (plugins_list[plugin]['has_discussions']) {
                let discussions_column = document.createElement("div")
                discussions_column.className = "col-auto align-self-center me-1"
                urls_row.appendChild(discussions_column)
                let discussions_link = document.createElement("a")
                discussions_link.className = "nav-link nav-link-sm text-white"
                discussions_link.href = `${plugins_list[plugin]['html_url']}/discussions`
                discussions_link.target = "_blank"
                discussions_column.appendChild(discussions_link)
                let discussions_icon = document.createElement("i")
                discussions_icon.className = "fa-solid fa-comments fa-xl align-middle"
                discussions_icon.setAttribute('title', 'GitHub Discussions')
                discussions_link.appendChild(discussions_icon)
            }

            // add stats
            let stats_row = document.createElement("div")
            // move to bottom of data_column
            stats_row.className = "row w-100 mt-auto pt-4"
            data_column.appendChild(stats_row)

            // add stars
            let stars_column = document.createElement("div")
            stars_column.className = "col-auto align-self-center me-1"
            stats_row.appendChild(stars_column)
            let stars_link = document.createElement("a")
            stars_link.className = "nav-link nav-link-sm text-white"
            stars_link.href = `${plugins_list[plugin]['html_url']}/stargazers`
            stars_link.target = "_blank"
            stars_link.setAttribute('title', 'Stars')
            stars_column.appendChild(stars_link)
            let stars_icon = document.createElement("i")
            stars_icon.className = "fa-solid fa-star align-middle"
            stars_link.appendChild(stars_icon)
            let stars_text = document.createElement("p")
            stars_text.className = "card-text ms-2 d-inline"
            stars_text.textContent = plugins_list[plugin]['stargazers_count']
            stars_link.appendChild(stars_text)

            // add forks
            let forks_column = document.createElement("div")
            forks_column.className = "col-auto align-self-center me-1"
            stats_row.appendChild(forks_column)
            let forks_link = document.createElement("a")
            forks_link.className = "nav-link nav-link-sm text-white"
            forks_link.href = `${plugins_list[plugin]['html_url']}/forks`
            forks_link.target = "_blank"
            forks_link.setAttribute('title', 'Forks')
            forks_column.appendChild(forks_link)
            let forks_icon = document.createElement("i")
            forks_icon.className = "fa-solid fa-code-fork align-middle"
            forks_link.appendChild(forks_icon)
            let forks_text = document.createElement("p")
            forks_text.className = "card-text ms-2 d-inline"
            forks_text.textContent = plugins_list[plugin]['forks_count']
            forks_link.appendChild(forks_text)

            // add open pull requests count
            let prs_column = document.createElement("div")
            prs_column.className = "col-auto align-self-center me-1"
            stats_row.appendChild(prs_column)
            let prs_link = document.createElement("a")
            prs_link.className = "nav-link nav-link-sm text-white"
            prs_link.href = `${plugins_list[plugin]['html_url']}/pulls`
            prs_link.target = "_blank"
            prs_link.setAttribute('title', 'Open Pull Requests')
            prs_column.appendChild(prs_link)
            let prs_icon = document.createElement("i")
            prs_icon.className = "fa-solid fa-code-pull-request align-middle"
            prs_link.appendChild(prs_icon)
            let prs_text = document.createElement("p")
            prs_text.className = "card-text ms-2 d-inline"
            prs_text.textContent = plugins_list[plugin]['open_pull_requests_count']
            prs_link.appendChild(prs_text)

            // add open issues count
            if (plugins_list[plugin]['has_issues']) {
                let issues_column = document.createElement("div")
                issues_column.className = "col-auto align-self-center me-1"
                stats_row.appendChild(issues_column)
                let issues_link = document.createElement("a")
                issues_link.className = "nav-link nav-link-sm text-white"
                issues_link.href = `${plugins_list[plugin]['html_url']}/issues`
                issues_link.target = "_blank"
                issues_link.setAttribute('title', 'Open Issues')
                issues_column.appendChild(issues_link)
                let issues_icon = document.createElement("i")
                issues_icon.className = "fa-regular fa-circle-dot align-middle"
                issues_link.appendChild(issues_icon)
                let issues_text = document.createElement("p")
                issues_text.className = "card-text ms-2 d-inline"
                issues_text.textContent = plugins_list[plugin]['open_issues_count']
                issues_link.appendChild(issues_text)
            }

        }
        else if (plugins_list[plugin]['installed_data']['type'] === "system") {
            let category_column = document.createElement("div")
            category_column.className = "col-auto align-self-center"
            categories_row.appendChild(category_column)
            let category_badge = document.createElement("span")
            category_badge.className = "badge bg-warning text-dark"
            category_badge.textContent = "System Plugin"
            category_column.appendChild(category_badge)

            // Plex icon
            let system_plugin_column = document.createElement("div")
            system_plugin_column.className = "col-auto align-self-center me-1"
            urls_row.appendChild(system_plugin_column)
            let system_plugin_link = document.createElement("a")
            system_plugin_link.className = "nav-link nav-link-sm text-white"
            system_plugin_link.href = "https://forums.plex.tv"
            system_plugin_link.target = "_blank"
            system_plugin_column.appendChild(system_plugin_link)
            let system_plugin_icon = document.createElement("span")
            system_plugin_icon.className = "fa-stack fa-xs"
            system_plugin_icon.setAttribute('title', 'Plex Forum')
            system_plugin_link.appendChild(system_plugin_icon)
            let system_plugin_icon_outer = document.createElement("i")
            system_plugin_icon_outer.className = "fa-regular fa-circle fa-stack-2x"
            system_plugin_icon.appendChild(system_plugin_icon_outer)
            let system_plugin_icon_inner = document.createElement("i")
            system_plugin_icon_inner.className = "fa-solid fa-chevron-right fa-stack-1x"
            system_plugin_icon.appendChild(system_plugin_icon_inner)
        }

        let card_footer = document.createElement("div")
        // move to bottom of data_column
        card_footer.className = "row w-100 mt-auto pt-4"
        data_column.appendChild(card_footer)

        if (plugins_list[plugin]['installed']) {
            let plugin_identifier = plugins_list[plugin]['installed_data']['bundle_identifier']

            let installed_version = document.createElement("p")
            installed_version.className = "card-text ms-0 mx-2"
            installed_version.textContent = `Installed Version: ${plugins_list[plugin]['installed_data']['version']}`
            text_container.appendChild(installed_version)

            // add icon to open logs
            let logs_column = document.createElement("div")
            logs_column.className = "col-auto align-self-center me-1"
            card_footer.appendChild(logs_column)



            let logs_icon = document.createElement("i")
            logs_icon.className = "fa-solid fa-file-lines fa-xl align-middle"
            logs_icon.style.cssText = "cursor:pointer;cursor:hand"
            logs_icon.setAttribute('title', 'Logs')
            logs_icon.setAttribute("data-bs-toggle", "modal")
            logs_icon.setAttribute("data-bs-target", "#logsModal")
            logs_icon.setAttribute("data-bs-plugin_name", plugin_name)
            logs_icon.setAttribute("data-bs-plugin_identifier", plugin_identifier)
            // logs_icon.onclick = function () {
            //     // open url
            //     // window.open(`/logs/${plugin_identifier}`, "_blank")
            // }
            logs_column.appendChild(logs_icon)

            if (plugins_list[plugin]['installed_data']['type'] === "user") {

                // add icon to update
                let update_column = document.createElement("div")
                update_column.className = "col-auto align-self-center me-1"
                card_footer.appendChild(update_column)

                let update_icon = document.createElement("i")
                update_icon.className = "fa-solid fa-sync fa-xl align-middle"
                update_icon.style.cssText = "cursor:pointer;cursor:hand"
                update_icon.setAttribute('title', 'Force Update')
                update_icon.onclick = function () {
                    // open url
                    window.open(`/update/${plugin_identifier}`, "_blank")
                }
                update_column.appendChild(update_icon)

                // add icon to open logs
                let uninstall_column = document.createElement("div")
                uninstall_column.className = "col-auto align-self-center me-1"
                card_footer.appendChild(uninstall_column)

                let uninstall_icon = document.createElement("i")
                uninstall_icon.className = "fa-solid fa-trash fa-xl align-middle"
                uninstall_icon.style.cssText = "cursor:pointer;cursor:hand"
                uninstall_icon.setAttribute('title', 'Uninstall')
                uninstall_icon.onclick = function () {
                    // open url
                    window.open(`/uninstall/${plugin_identifier}`, "_blank")
                }
                uninstall_column.appendChild(uninstall_icon)
            }
        }
        else {
            // add icon to install
            let install_column = document.createElement("div")
            install_column.className = "col-auto align-self-center me-1"
            card_footer.appendChild(install_column)

            let install_icon = document.createElement("i")
            install_icon.className = "fa-solid fa-download fa-xl align-middle"
            install_icon.style.cssText = "cursor:pointer;cursor:hand"
            install_icon.setAttribute('title', 'Install')
            install_icon.onclick = function () {
                // open url
                window.open(`/install/${plugins_list[plugin]['identifier']}`, "_blank")
            }
            install_column.appendChild(install_icon)
        }
    }
}


let compare_urls = function (a, b) {
    // if a and b are not null
    if (a && b) {
        // remove trailing slash
        if (a.slice(-1) === "/") {
            a = a.slice(0, -1)
        }
        if (b.slice(-1) === "/") {
            b = b.slice(0, -1)
        }
    }

    return a === b;
}


let run_search = function () {
    // get the search container
    let search_container = document.getElementById("search-container")
    search_container.innerHTML = ""

    // create FormData object
    let data = new FormData()

    // append field and values to FormData object
    let all = document.querySelectorAll("#searchForm input, #searchForm textarea, #searchForm select")
    for (let field of all) {
        // exclude submit and buttons
        if (field.type !== "submit" && field.type !== "button") {
            // checkbox fields
            if (field.type === "checkbox") {
                data.append(field.id, field.checked)
            }
            // radio fields... must be checked
            else if (field.type === "radio") {
                if (field.checked) {
                    data.append(field.id, field.value)
                }
            }
            // other fields
            else {
                data.append(field.id, field.value)
            }
        }
    }

    // extract the search values from the data object
    let search_type = data.get("search_type")
    let search_term = data.get("search_term")

    // if the search term is empty, don't do anything
    if (search_term === "") {
        return
    }

    // hide the existing content
    document.getElementById("Games").classList.add("d-none")
    document.getElementById("Movies").classList.add("d-none")

    // get the item type
    let type = Object.keys(types_dict)[search_type]

    // check if the all_search_items array is empty
    if (types_dict[type]['all_search_items'].length === 0) {
        // reset page count
        let page = 1
        let total_pages = 1

        // get total number of pages
        $.ajax({
            async: false,
            url: `${types_dict[type]['base_url']}pages.json`,
            type: "GET",
            dataType: "json",
            success: function (result) {
                total_pages = result['pages']
            }
        })

        // loop through all pages
        while (page <= total_pages) {
            $.ajax({
                async: false,
                url: `${types_dict[type]['base_url']}all_page_${page}.json`,
                type: "GET",
                dataType: "json",
                success: function (result) {
                    // loop through all items in the page
                    for (let item of result) {
                        types_dict[type]['all_search_items'].push(item)
                    }
                }
            })
            page += 1
        }
    }

    // results list
    let result = []

    // loop through all search items
    for (let item of types_dict[type]['all_search_items']) {
        // search using levenshtein distance
        item['score'] = levenshteinDistance.get(search_term.toLowerCase(), item['title'].toLowerCase())
        if (item['score'] >= 40) {
            result.push(item)
        }
    }

    // add a clear results button
    let clear_results_button = document.createElement("button")
    clear_results_button.className = "btn btn-danger rounded-0 mb-5"
    clear_results_button.textContent = "Clear Results"
    search_container.appendChild(clear_results_button)
    clear_results_button.onclick = function () {
        search_container.innerHTML = ""
        document.getElementById("Games").classList.remove("d-none")
        document.getElementById("Movies").classList.remove("d-none")
    }

    let item_type_container = document.createElement("div")
    search_container.appendChild(item_type_container)

    let sorted = result.sort(rankingSorter('score', 'title'))

    populate_results(type, sorted, item_type_container)
}

$(document).ready(function() {
    // replace default function of enter key in search form
    document.getElementById("searchForm").addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault()
            run_search()
        }
    })
})

// load external js scripts
$.getScript('https://app.lizardbyte.dev/js/levenshtein_distance.js')
$.getScript('https://app.lizardbyte.dev/js/ranking_sorter.js')

// load local js scripts
$.getScript('/web/js/translations.js')


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

// get search options, we will append each category to this list
let search_options = document.getElementById("search_type")

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

    // set all plugins installed state to false and add the github_id
    for (let plugger_plugin in plugger_plugins) {
        plugger_plugins[plugger_plugin]['installed'] = false
        plugger_plugins[plugger_plugin]['installed_data'] = null
        plugger_plugins[plugger_plugin]['github_id'] = parseInt(plugger_plugin)
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
    populate_results(all_plugins, plugins_container, true)

    // set up the alert listener
    setup_alert_listener()
})


let populate_results = function (plugins_list, container, update_counts = false) {
    for (let plugin in plugins_list) {
        let plugin_name = plugins_list[plugin]['name']

        let item_container = document.createElement("div")
        item_container.className = "container mb-5 shadow border-0 bg-dark rounded-0 px-0"
        container.appendChild(item_container)

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
                // if category is not in search_type drop down, add it
                let search_option = document.createElement("div")
                search_option.className = "form-check"
                let search_option_input = document.createElement("input")
                search_option_input.className = "form-check-input"
                search_option_input.type = "checkbox"
                let category_id = `category_${plugins_list[plugin]['categories'][category].replace(" ", "_").toLowerCase()}`
                search_option_input.id = category_id
                search_option.appendChild(search_option_input)
                let search_option_label = document.createElement("label")
                search_option_label.className = "form-check-label"
                search_option_label.setAttribute("for", category_id)
                search_option_label.textContent = getTranslation(plugins_list[plugin]['categories'][category])
                search_option.appendChild(search_option_label)
                let search_option_count_label = document.createElement("label")
                search_option_count_label.className = "form-check-label badge bg-danger ms-2"
                search_option_count_label.setAttribute("for", category_id)
                search_option_count_label.textContent = "1"
                search_option.appendChild(search_option_count_label)

                let add_category = true
                for (let i = 0; i < search_options.children.length; i++) {
                    if (search_options.children[i].children[1].textContent === search_option_label.textContent) {
                        add_category = false
                        // increment the count
                        if (update_counts) {
                            let count = parseInt(search_options.children[i].children[2].textContent)
                            search_options.children[i].children[2].textContent = `${count + 1}`
                        }
                        break
                    }
                }
                if (add_category) {
                    search_options.appendChild(search_option)

                    // sort options alphabetically
                    for (let i = 0; i < search_options.children.length; i++) {
                        for (let j = i + 1; j < search_options.children.length; j++) {
                            if (search_options.children[i].textContent.trim() > search_options.children[j].textContent.trim()) {
                                let temp = search_options.children[i].innerHTML
                                search_options.children[i].innerHTML = search_options.children[j].innerHTML
                                search_options.children[j].innerHTML = temp
                            }
                        }
                    }
                }

                let category_column = document.createElement("div")
                category_column.className = "col-auto align-self-center"
                categories_row.appendChild(category_column)
                let category_badge = document.createElement("span")
                category_badge.className = "badge bg-secondary"
                category_badge.textContent = getTranslation(plugins_list[plugin]['categories'][category])
                category_column.appendChild(category_badge)
            }
            // add a categories edit button using fontawesome icon
            // todo - pass categories to the issue form
            let edit_link = `https://github.com/LizardByte/PluggerDB/issues/new?assignees=&labels=request-plugin&template=plugin.yml&title=${encodeURIComponent('[PLUGIN]: ')}${encodeURIComponent(plugins_list[plugin]['html_url'].replace('https://github.com/', ''))}&github_url=${encodeURIComponent(plugins_list[plugin]['html_url'])}`
            let category_column = document.createElement("div")
            category_column.className = "col-auto align-self-center"
            categories_row.appendChild(category_column)
            let category_edit_button = document.createElement("a")
            category_edit_button.className = "nav-link nav-link-sm text-white"
            category_edit_button.href = edit_link
            category_edit_button.target = "_blank"
            category_column.appendChild(category_edit_button)
            let category_edit_icon = document.createElement("i")
            category_edit_icon.className = "fa-solid fa-edit fa-1x align-middle"
            category_edit_icon.setAttribute('title', getTranslation('Edit Categories'))
            category_edit_button.appendChild(category_edit_icon)

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
                    homepage_icon.setAttribute('title', getTranslation('Homepage'))
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
                    gh_pages_icon.setAttribute('title', getTranslation('Website'))
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
                license_icon.setAttribute('title', getTranslation('License'))
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
                wiki_icon.setAttribute('title', getTranslation('GitHub Wiki'))
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
                discussions_icon.setAttribute('title', getTranslation('GitHub Discussions'))
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
            stars_link.setAttribute('title', getTranslation('Stars'))
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
            forks_link.setAttribute('title', getTranslation('Forks'))
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
            prs_link.setAttribute('title', getTranslation('Open Pull Requests'))
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
                issues_link.setAttribute('title', getTranslation('Open Issues'))
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
            // add the system plugin category
            plugins_list[plugin]['categories'] = ["System Plugin"]
            // add counts (for sorting only)
            plugins_list[plugin]['github_id'] = -1
            plugins_list[plugin]['stargazers_count'] = -1
            plugins_list[plugin]['forks_count'] = -1
            plugins_list[plugin]['open_pull_requests_count'] = -1
            plugins_list[plugin]['open_issues_count'] = -1

            // increment the count in the search_options drop down
            if (update_counts) {
                let system_plugin_count = document.getElementById("count_system_plugin")
                system_plugin_count.textContent = `${parseInt(system_plugin_count.textContent) + 1}`
            }

            let category_column = document.createElement("div")
            category_column.className = "col-auto align-self-center"
            categories_row.appendChild(category_column)
            let category_badge = document.createElement("span")
            category_badge.className = "badge bg-warning text-dark"
            category_badge.textContent = getTranslation("System Plugin")
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
            system_plugin_icon.setAttribute('title', getTranslation('Plex Forum'))
            system_plugin_link.appendChild(system_plugin_icon)
            let system_plugin_icon_outer = document.createElement("i")
            system_plugin_icon_outer.className = "fa-regular fa-circle fa-stack-2x"
            system_plugin_icon.appendChild(system_plugin_icon_outer)
            let system_plugin_icon_inner = document.createElement("i")
            system_plugin_icon_inner.className = "fa-solid fa-chevron-right fa-stack-1x"
            system_plugin_icon.appendChild(system_plugin_icon_inner)
        }
        else if (plugins_list[plugin]['installed_data']['type'] === "user") {
            // these are installed plugins that are not system plugins and not in our database

            // add the installed plugin category
            plugins_list[plugin]['categories'] = []  // empty list, "Installed Plugin" will be added later
            // add counts (for sorting only)
            plugins_list[plugin]['github_id'] = -1
            plugins_list[plugin]['stargazers_count'] = -1
            plugins_list[plugin]['forks_count'] = -1
            plugins_list[plugin]['open_pull_requests_count'] = -1
            plugins_list[plugin]['open_issues_count'] = -1
        }

        if (plugins_list[plugin]['installed']) {
            // add installed category
            try {
                plugins_list[plugin]['categories'].includes("Installed Plugin")
            } catch (e) {
                // plugin is installed, but not a system plugin and not in our database
                plugins_list[plugin]['categories'] = ["Installed Plugin"]
            } finally {
                if (plugins_list[plugin]['categories'].includes("Installed Plugin") === false) {
                    // add "Installed Plugin" to the beginning of the array
                    plugins_list[plugin]['categories'].unshift("Installed Plugin")

                    // add the category badge
                    let category_column = document.createElement("div")
                    category_column.className = "col-auto align-self-center"
                    // categories_row.appendChild(category_column)
                    // move to the beginning of the row
                    categories_row.insertBefore(category_column, categories_row.firstChild)
                    let category_badge = document.createElement("span")
                    category_badge.className = "badge bg-info text-dark"
                    category_badge.textContent = getTranslation("Installed Plugin")
                    category_column.appendChild(category_badge)
                } else {
                    // change the badge color
                    for (let category of categories_row.children) {
                        if (category.textContent === getTranslation("Installed Plugin")) {
                            category.children[0].className = "badge bg-info text-dark"
                        }
                    }
                }

                // increment the count in the search_options drop down
                if (update_counts) {
                    let installed_plugin_count = document.getElementById("count_installed_plugin")
                    installed_plugin_count.textContent = `${parseInt(installed_plugin_count.textContent) + 1}`
                }
            }
        }

        let card_footer = document.createElement("div")
        // move to bottom of data_column
        card_footer.className = "row w-100 mt-auto pt-4"
        data_column.appendChild(card_footer)

        if (plugins_list[plugin]['installed']) {
            let plugin_identifier = plugins_list[plugin]['installed_data']['bundle_identifier']

            let installed_version = document.createElement("p")
            installed_version.className = "card-text ms-0 mx-2"
            installed_version.textContent = `${getTranslation('Installed Version:')} ${plugins_list[plugin]['installed_data']['version']}`
            text_container.appendChild(installed_version)

            // add icon to open logs
            let logs_column = document.createElement("div")
            logs_column.className = "col-auto align-self-center me-1"
            card_footer.appendChild(logs_column)



            let logs_icon = document.createElement("i")
            logs_icon.className = "fa-solid fa-file-lines fa-xl align-middle"
            logs_icon.style.cssText = "cursor:pointer;cursor:hand"
            logs_icon.setAttribute('title', getTranslation('Logs'))
            logs_icon.setAttribute("data-bs-toggle", "modal")
            logs_icon.setAttribute("data-bs-target", "#logsModal")
            logs_icon.setAttribute("data-bs-plugin_name", plugin_name)
            logs_icon.setAttribute("data-bs-plugin_identifier", plugin_identifier)
            logs_column.appendChild(logs_icon)

            if (plugins_list[plugin]['installed_data']['type'] === "user") {

                // add icon to update
                let update_column = document.createElement("div")
                update_column.className = "col-auto align-self-center me-1"
                card_footer.appendChild(update_column)

                let update_icon = document.createElement("i")
                update_icon.className = "fa-solid fa-sync fa-xl align-middle"
                update_icon.style.cssText = "cursor:pointer;cursor:hand"
                update_icon.setAttribute('title', getTranslation('Force Update'))
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
                uninstall_icon.setAttribute('title', getTranslation('Uninstall'))
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
            install_icon.setAttribute('title', getTranslation('Install'))
            install_icon.setAttribute("data-bs-toggle", "modal")
            install_icon.setAttribute("data-bs-target", "#installModal")
            install_icon.setAttribute("data-bs-plugin_name", plugin_name)
            install_icon.setAttribute("data-bs-github_id", plugins_list[plugin]['github_id'])
            install_column.appendChild(install_icon)
        }
    }
}


let setup_alert_listener = function () {
    // add event listener to the parent element
    search_options.addEventListener("click", function(event) {
        // prevent dropdown-menu from closing on click
        event.stopPropagation()
        // check if the clicked element was an input checkbox
        if (event.target.tagName === "INPUT" && event.target.type === "checkbox") {
            if (event.target.getAttribute("data-event-state") === "unchecked") {
                // check
                event.target.checked = true
                event.target.indeterminate = false
                event.target.setAttribute("data-event-state", "checked")
            } else if (event.target.getAttribute("data-event-state") === "checked") {
                // make intermediate
                event.target.checked = false
                event.target.indeterminate = true
                event.target.setAttribute("data-event-state", "indeterminate")
            } else if (event.target.getAttribute("data-event-state") === "indeterminate") {
                // uncheck
                event.target.checked = false
                event.target.indeterminate = false
                event.target.setAttribute("data-event-state", "unchecked")
            }
        }
    })

    // set data attributes for each checkbox
    for (let i = 0; i < search_options.children.length; i++) {
        let checkbox = search_options.children[i].children[0]
        if (checkbox.checked && checkbox.indeterminate === false) {
            checkbox.setAttribute("data-event-state", "checked")
        }
        else if (checkbox.checked === false && checkbox.indeterminate === true) {
            checkbox.setAttribute("data-event-state", "indeterminate")
        }
        else if (checkbox.checked === false && checkbox.indeterminate === false) {
            checkbox.setAttribute("data-event-state", "unchecked")
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
                if (field.indeterminate === true) {
                    // exclude these categories completely
                    data.append(`exclude_${field.id}`, field.indeterminate)
                }
                else if (field.checked) {
                    data.append(`include_${field.id}`, field.checked)
                }
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
    // get the search term
    let search_term = data.get("search_term")
    // get the sort type
    let sort_type = data.get("sort_type")

    // get the excluded and included categories
    let excluded_categories = []
    let included_categories = []
    for (let key of data.keys()) {
        if (key.startsWith("exclude_category_")) {
            let category = key.replace("exclude_category_", "")
            if (data.get(key) === "true") {
                excluded_categories.push(category)
            }
        }
        else if (key.startsWith("include_category_")) {
            let category = key.replace("include_category_", "")
            if (data.get(key) === "true") {
                included_categories.push(category)
            }
        }
    }

    // hide the existing content
    document.getElementById("Plugins").classList.add("d-none")

    // results list
    let result = []

    // search title
    let search_title = true
    if (search_term === "") {
        search_title = false
    }

    // add plugger plugins to all plugins list
    for (let plugin in all_plugins) {
        let add_plugin = false

        for (let category in all_plugins[plugin]['categories']) {
            let cat_representation = all_plugins[plugin]['categories'][category].toLowerCase().replace(" ", "_")
            // check if the plugin is in the excluded categories
            if (excluded_categories.includes(cat_representation)) {
                add_plugin = false
                break
            }
            // check if the plugin is in the included categories
            else if (included_categories.length === 0) {
                add_plugin = true
            }
            else if (included_categories.length > 0 && included_categories.includes(cat_representation)) {
                add_plugin = true
            }
        }

        // if the plugin is not in the excluded categories and is in the included categories
        if (add_plugin === true) {
            // no search term provided so add all plugins
            if (search_title === false) {
                result.push(all_plugins[plugin])
            } else {
                // search using levenshtein distance
                let score = levenshteinDistance.get(search_term.toLowerCase(), all_plugins[plugin]['name'].toLowerCase())
                if (score >= 40) {
                    result.push(all_plugins[plugin])
                    result[result.length - 1]['score'] = score
                }
            }
        }
    }

    // add a clear results button
    let clear_results_button = document.createElement("button")
    clear_results_button.className = "btn btn-danger rounded-0 mb-5"
    clear_results_button.textContent = getTranslation("Clear Results")
    search_container.appendChild(clear_results_button)
    clear_results_button.onclick = function () {
        search_container.innerHTML = ""
        document.getElementById("Plugins").classList.remove("d-none")
    }

    let item_type_container = document.createElement("div")
    search_container.appendChild(item_type_container)

    let sorted
    let primary_sort
    let secondary_sort
    if (search_title === true) {
        if (sort_type === "0") {
            primary_sort = 'score'
            secondary_sort = 'name_lower'
        }
        else {
            primary_sort = sort_type
            secondary_sort = 'score'
        }
        sorted = result.sort(rankingSorter(primary_sort, secondary_sort))
    }
    else {
        if (sort_type === "0") {
            primary_sort = 'name_lower'
            secondary_sort = 'full_name'
        }
        else {
            primary_sort = sort_type
            secondary_sort = 'full_name'
        }
        if (primary_sort === "name_lower") {
            sorted = result.sort(rankingSorter(primary_sort, secondary_sort)).reverse()
        }
        else {
            sorted = result.sort(rankingSorter(primary_sort, secondary_sort))
        }
    }

    populate_results(sorted, search_container, false)
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

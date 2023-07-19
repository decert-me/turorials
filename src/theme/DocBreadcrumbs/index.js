import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import {ThemeClassNames, useThemeConfig} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useSidebarBreadcrumbs,
} from '@docusaurus/theme-common/internal';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';
import NavbarMobileSidebarSecondaryMenu from '@theme/Navbar/MobileSidebar/SecondaryMenu';
import NavbarMobileSidebarPrimaryMenu from '@theme/Navbar/MobileSidebar/PrimaryMenu';
import styles from './styles.module.css';
import {
  HomeFilled,
} from '@ant-design/icons';
import { useLocation } from '@docusaurus/router';


// TODO move to design system folder
function BreadcrumbsItemLink({children, href, isLast}) {
  const className = 'breadcrumbs__link';
  if (isLast) {
    return (
      <span className={className} itemProp="name">
        {children}
      </span>
    );
  }
  return href ? (
    <Link className={className} href={href} itemProp="item">
      <span itemProp="name">{children}</span>
    </Link>
  ) : (
    // TODO Google search console doesn't like breadcrumb items without href.
    // The schema doesn't seem to require `id` for each `item`, although Google
    // insist to infer one, even if it's invalid. Removing `itemProp="item
    // name"` for now, since I don't know how to properly fix it.
    // See https://github.com/facebook/docusaurus/issues/7241
    <span className={className}>{children}</span>
  );
}
// TODO move to design system folder
function BreadcrumbsItem({children, active, index, addMicrodata, select, setSelect, toggleMenu}) {
  function isSelect(params) {
    if (setSelect) {      
      if (index === 1) {
        toggleMenu(false)
        setSelect(!select)
      }
      if (index === 0) {
        toggleMenu(true)
        setSelect(!select)
      }
    }
  }
  return (
    <li
      {...(addMicrodata && {
        itemScope: true,
        itemProp: 'itemListElement',
        itemType: 'https://schema.org/ListItem',
      })}
      onClick={() => isSelect()}
      className={clsx('breadcrumbs__item', {
        'breadcrumbs__item--active': active,
      })}>
      {children}
      <meta itemProp="position" content={String(index + 1)} />
    </li>
  );
}

function useNavbarItems() {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items;
}

export default function DocBreadcrumbs() {
  const breadcrumbs = useSidebarBreadcrumbs();
  const items = useNavbarItems();
  const location = useLocation();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const [isShow, setIsShow] = useState(false);
  let [isMobile, setIsMobile] = useState(false);
  let [select, setSelect] = useState(false);
  let [primaryMenu, setPrimaryMenu] = useState([]);
  let [top, setTop] = useState(0);
  
  function toggleMenu(params) {
    setIsShow(params)
  }

  useEffect(() => {
    leftItems.map(e => {
      const base = e.docId.split("/")[0];
      if (location.pathname.includes(base)) {
        primaryMenu.push(e)
      }
    })
    setPrimaryMenu([...primaryMenu])
  },[])

  useEffect(() => {
    const box = document.querySelector(".theme-doc-breadcrumbs");
    if (box) {
      const resizeObserver = new ResizeObserver(entries => {
        // 监听到元素大小变化后执行的回调函数
        const { height } = entries[0].contentRect;
        top = height;
        setTop(top);
      });
  
      resizeObserver.observe(box);
  
      return () => {
        resizeObserver.unobserve(box);
      };
    }
  }, []);

  if (!breadcrumbs) {
    return null;
  }

  useEffect(() => {
    if (select) {
      document.querySelector("body").style.cssText = "overflow: hidden !important;"
    }else{
      document.querySelector("body").style.cssText = "overflow: auto;"
    }
  },[select])

  useEffect(() => {
    isMobile = document.documentElement.clientWidth <= 996 ? true : false;
    setIsMobile(isMobile);
  },[])

  return (
    <>
      <nav
        className={clsx(
          ThemeClassNames.docs.docBreadcrumbs,
          styles.breadcrumbsContainer,
        )}
        aria-label={translate({
          id: 'theme.docs.breadcrumbs.navAriaLabel',
          message: 'Breadcrumbs',
          description: 'The ARIA label for the breadcrumbs',
        })}>
          {
            isMobile ?
            <ul
              className="breadcrumbs"
              itemScope
              itemType="https://schema.org/BreadcrumbList">
              <li className='breadcrumbs__item'>
              <a href="https://decert.me/tutorials">
                <HomeFilled style={{color: "#000"}} />
              </a>
            </li>
            {primaryMenu.concat(breadcrumbs).map((item, idx) => {
              const isLast = idx === primaryMenu.concat(breadcrumbs).length - 1;
                return (
                  <BreadcrumbsItem
                    key={idx}
                    active={isLast}
                    index={idx}
                    addMicrodata={!!item.href}
                    >
                    <BreadcrumbsItemLink href={item.href} isLast={isLast}>
                      {item.label}
                    </BreadcrumbsItemLink>
                  </BreadcrumbsItem>
                );
              })}
            </ul> 
            :
            <ul
            className="breadcrumbs"
            itemScope
            itemType="https://schema.org/BreadcrumbList">
            <li className='breadcrumbs__item'>
              <a href="https://decert.me/tutorials">
                <HomeFilled style={{color: "#000"}} />
              </a>
            </li>
            {primaryMenu.concat(breadcrumbs).map((item, idx) => {
              const isLast = idx === primaryMenu.concat(breadcrumbs).length - 1;
              return (
                <BreadcrumbsItem
                  key={idx}
                  active={isLast}
                  index={idx}
                  addMicrodata={!!item.href}
                  select={select}
                  setSelect={setSelect}
                  toggleMenu={toggleMenu}
                >
                  <BreadcrumbsItemLink href={item.href} isLast={isLast}>
                    {item.label}
                  </BreadcrumbsItemLink>
                </BreadcrumbsItem>
              );
            })}
          </ul>
          }
      </nav>
      {
        select &&
        <div>
          <div className='custom-bread' style={{top: `${top + 16 + 60 + 5}px`}}>
            {
              isShow ?
              <NavbarMobileSidebarPrimaryMenu />
              :
              <>
              <NavbarMobileSidebarSecondaryMenu />
              </>
            }
          </div>
          <div className="custom-mask" onClick={() => setSelect(false)}></div>
        </div>
      }
    </>
  );
}

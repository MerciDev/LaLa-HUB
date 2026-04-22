import React from 'react'

interface PageNavigatorProps {
    totalPages: number
    currentPage: number
    onPageClick: (index: number) => void
}

function PageNavigator({ totalPages, currentPage, onPageClick }: PageNavigatorProps): React.JSX.Element {
    return (
        <div className="pageNavigator">
            {Array.from({ length: totalPages }).map((_, index) => (
                <div
                    key={index}
                    className={`navDot ${index === currentPage ? 'active' : ''}`}
                    onClick={() => onPageClick(index)}
                />
            ))}
        </div>
    )
}

export default PageNavigator

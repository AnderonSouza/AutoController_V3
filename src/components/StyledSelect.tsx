import React from 'react';

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  containerClassName?: string;
}

const StyledSelect: React.FC<StyledSelectProps> = ({ children, className, containerClassName, ...props }) => {
  return (
    <div className={`relative inline-block group ${containerClassName}`}>
      <select
        {...props}
        className={`
          appearance-none
          w-full
          bg-white 
          border border-slate-300
          group-hover:border-slate-400
          focus:ring-2 
          focus:ring-primary/10
          focus:border-primary
          focus:outline-none
          rounded-lg 
          text-slate-700 font-semibold
          transition-all
          shadow-sm
          cursor-pointer
          ${className || 'py-2.5 pl-4 pr-10 text-sm'}
        `}
      >
        {children}
      </select>
      
      <div className="
        absolute inset-y-0 right-0 
        flex items-center
        px-3
        pointer-events-none
        text-slate-400
        group-hover:text-primary
        transition-colors
      ">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default StyledSelect;
